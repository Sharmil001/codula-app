// lib/github-pr-analyzer.ts
import { Octokit } from 'octokit';
import { getGitHubClient } from './github';
import { PRData, PRStory } from '@/types/github';


/**
 * Parse GitHub PR URL to extract owner, repo, and PR number
 */
export function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
  try {
    // Clean the URL and handle various formats
    const cleanUrl = url.trim();
    
    const patterns = [
      // Standard PR URL
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
      // Alternative format
      /github\.com\/([^\/]+)\/([^\/]+)\/pulls\/(\d+)/,
      // With query parameters
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)(?:\?.*)?$/,
      // With hash fragments
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)(?:#.*)?$/,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          prNumber: parseInt(match[3], 10)
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch comprehensive PR data from GitHub API
 */
export async function fetchPRData(owner: string, repo: string, prNumber: number): Promise<PRData> {
  try {
    const octokit = await getGitHubClient();

    // Fetch PR details, files, commits, and reviews in parallel
    const [prResponse, filesResponse, commitsResponse, reviewsResponse] = await Promise.all([
      octokit.rest.pulls.get({ 
        owner, 
        repo, 
        pull_number: prNumber 
      }).catch(err => {
        throw new Error(`Failed to fetch PR details: ${err.message}`);
      }),
      
      octokit.rest.pulls.listFiles({ 
        owner, 
        repo, 
        pull_number: prNumber,
        per_page: 50 
      }).catch(err => {
        throw new Error(`Failed to fetch PR files: ${err.message}`);
      }),
      
      octokit.rest.pulls.listCommits({ 
        owner, 
        repo, 
        pull_number: prNumber,
        per_page: 30 
      }).catch(err => {
        throw new Error(`Failed to fetch PR commits: ${err.message}`);
      }),
      
      octokit.rest.pulls.listReviews({ 
        owner, 
        repo, 
        pull_number: prNumber,
        per_page: 20 
      }).catch(() => ({ data: [] })) // Reviews might not be accessible
    ]);

    const pr = prResponse.data;
    const files = filesResponse.data;
    const commits = commitsResponse.data;
    const reviews = reviewsResponse.data;

    // Get review comments (might fail for private repos or without permissions)
    let reviewComments: any[] = [];
    try {
      const reviewCommentsResponse = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 20
      });
      reviewComments = reviewCommentsResponse.data;
    } catch (err) {
      // Silently fail if we can't access review comments
    }

    return {
      title: pr.title || '',
      description: pr.body || '',
      author: pr.user?.login || 'Unknown',
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || files.length,
      commits: commits.map(commit => ({
        message: commit.commit.message || '',
        author: commit.author?.login || commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || new Date().toISOString()
      })),
      files: files.map(file => ({
        filename: file.filename,
        status: (file.status as any) || 'modified',
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        patch: file.patch || undefined
      })),
      reviewComments: reviewComments.map(comment => ({
        author: comment.user?.login || 'Unknown',
        body: comment.body || '',
        createdAt: comment.created_at || new Date().toISOString()
      })),
      labels: pr.labels?.map(label => 
        typeof label === 'string' ? label : (label.name || '')
      ).filter(Boolean) || [],
      linkedIssues: extractLinkedIssues(pr.body || '')
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch PR data from GitHub');
  }
}

/**
 * Extract issue references from PR description
 */
function extractLinkedIssues(body: string): string[] {
  try {
    const issuePatterns = [
      /#(\d+)/g,
      /closes\s+#(\d+)/gi,
      /fixes\s+#(\d+)/gi,
      /resolves\s+#(\d+)/gi,
      /fix\s+#(\d+)/gi,
      /close\s+#(\d+)/gi,
      /resolve\s+#(\d+)/gi
    ];

    const issues = new Set<string>();
    
    for (const pattern of issuePatterns) {
      const matches = body.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !isNaN(parseInt(match[1]))) {
          issues.add(match[1]);
        }
      }
    }

    return Array.from(issues);
  } catch (error) {
    return [];
  }
}

/**
 * Analyze PR data using AI
 */
export async function analyzePR(prData: PRData): Promise<PRStory> {
  try {
    // Create a comprehensive but concise prompt
    const prompt = createAnalysisPrompt(prData);
    
    // Try different AI services in order of preference
    const aiResponse = await tryAIServices(prompt);
    
    return aiResponse;
  } catch (error) {
    // Fallback to rule-based analysis if AI fails
    return createFallbackAnalysis(prData);
  }
}

/**
 * Create a structured prompt for AI analysis
 */
function createAnalysisPrompt(prData: PRData): string {
  // Limit content to avoid token limits
  const maxCommits = 10;
  const maxFiles = 20;
  const maxComments = 5;

  return `Analyze this GitHub Pull Request and create a comprehensive story:

**PR Details:**
Title: ${prData.title}
Author: ${prData.author}
State: ${prData.state}
Created: ${new Date(prData.createdAt).toLocaleDateString()}
${prData.mergedAt ? `Merged: ${new Date(prData.mergedAt).toLocaleDateString()}` : ''}

**Description:**
${prData.description ? prData.description.substring(0, 1000) : 'No description provided'}

**Changes Summary:**
- +${prData.additions} additions, -${prData.deletions} deletions
- ${prData.changedFiles} files changed
- ${prData.commits.length} commits

**Key Commits:**
${prData.commits.slice(0, maxCommits).map((c, i) => `${i + 1}. ${c.message.split('\n')[0]}`).join('\n')}

**Files Modified:**
${prData.files.slice(0, maxFiles).map(f => `- ${f.filename} (${f.status}): +${f.additions}/-${f.deletions}`).join('\n')}

**Labels:** ${prData.labels.join(', ') || 'None'}

**Review Comments:**
${prData.reviewComments.slice(0, maxComments).map(c => `- ${c.author}: ${c.body.substring(0, 200)}`).join('\n')}

**Linked Issues:** ${prData.linkedIssues.length > 0 ? prData.linkedIssues.map(i => `#${i}`).join(', ') : 'None'}

Please analyze this PR and respond with a JSON object matching this exact structure:
{
  "summary": "Brief 1-2 sentence summary of what this PR accomplishes",
  "technicalDetails": "Technical explanation of the changes made",
  "impact": "Business/technical impact and value of these changes",
  "keyChanges": ["Change 1", "Change 2", "Change 3", "..."],
  "complexity": "low|medium|high",
  "tags": ["tag1", "tag2", "tag3", "..."]
}

Focus on:
1. What problem this PR solves
2. How it solves it technically
3. The impact/value it provides
4. Key implementation details
5. Appropriate complexity level based on scope and technical difficulty

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Try different AI services in order of preference
 */
async function tryAIServices(prompt: string): Promise<PRStory> {
  const services = [
    { name: 'openai', fn: callOpenAI },
    { name: 'anthropic', fn: callAnthropic },
    // Add more services as needed
  ];

  let lastError: Error | null = null;

  for (const service of services) {
    try {
      const result = await service.fn(prompt);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`${service.name} failed`);
      continue; // Try next service
    }
  }

  throw lastError || new Error('All AI services failed');
}

/**
 * OpenAI GPT integration
 */
async function callOpenAI(prompt: string): Promise<PRStory> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cheaper and faster than gpt-4
      messages: [
        {
          role: 'system',
          content: 'You are a senior software engineer analyzing GitHub pull requests. Provide insightful, technical analysis in JSON format. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON response from OpenAI');
  }
}

/**
 * Anthropic Claude integration
 */
async function callAnthropic(prompt: string): Promise<PRStory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Fastest and cheapest Claude model
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No content received from Anthropic');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON response from Anthropic');
  }
}

/**
 * Create a fallback analysis when AI services fail
 */
function createFallbackAnalysis(prData: PRData): PRStory {
  // Rule-based analysis as fallback
  const fileTypes = prData.files.map(f => f.filename.split('.').pop()?.toLowerCase()).filter(Boolean);
  const uniqueFileTypes = [...new Set(fileTypes)];
  
  const isLargeChange = prData.additions + prData.deletions > 500;
  const isManyFiles = prData.changedFiles > 10;
  const hasTests = prData.files.some(f => 
    f.filename.includes('test') || 
    f.filename.includes('spec') || 
    f.filename.includes('__tests__')
  );
  
  const complexity = isLargeChange || isManyFiles ? 'high' : 
                    prData.additions + prData.deletions > 100 ? 'medium' : 'low';

  const keyChanges = [
    `Modified ${prData.changedFiles} file${prData.changedFiles !== 1 ? 's' : ''}`,
    `Added ${prData.additions} lines, removed ${prData.deletions} lines`,
    ...(hasTests ? ['Includes test changes'] : []),
    ...(prData.commits.length > 1 ? [`${prData.commits.length} commits`] : [])
  ];

  const tags = [
    ...uniqueFileTypes.slice(0, 3).filter((type): type is string => Boolean(type)),
    ...(hasTests ? ['testing'] : []),
    ...(prData.labels.length > 0 ? prData.labels.slice(0, 2) : []),
    prData.state
  ].filter((tag): tag is string => Boolean(tag));

  return {
    summary: `This PR ${prData.state === 'merged' ? 'implemented' : 'proposes'} changes to ${prData.changedFiles} files with ${prData.additions + prData.deletions} total line changes.`,
    technicalDetails: `The changes span ${uniqueFileTypes.join(', ')} files and include ${prData.commits.length} commits. ${hasTests ? 'Test files were also modified.' : 'No test changes detected.'}`,
    impact: `This ${complexity} complexity change affects the codebase structure and ${prData.state === 'merged' ? 'has been' : 'would be'} integrated into the main branch.`,
    keyChanges,
    complexity: complexity as 'low' | 'medium' | 'high',
    tags
  };
}