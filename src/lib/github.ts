import { GitHubActivity, GitHubApiError, GitHubRepo } from '@/types/github';
import { supabase } from './supabase/client';
import { Octokit } from 'octokit';

const CONFIG = {
  OAUTH_WAIT_TIME: 1500,
  API_TIMEOUT: 15000,
  RETRY_COUNT: 2,
  SCOPES: 'repo,user:email'
} as const;

class TokenManager {
  private static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Authentication required');
    return user;
  }

  static async store(userId: string, token: string): Promise<void> {
    await supabase.from('user_tokens').upsert({
      user_id: userId,
      provider: 'github',
      access_token: token,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider' });
  }

  static async retrieve(): Promise<string> {
    const user = await this.getCurrentUser();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      await this.store(user.id, session.provider_token); // Cache for later
      return session.provider_token;
    }

    const { data } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .single();

    if (data?.access_token) return data.access_token;

    // Check if user has GitHub identity
    const hasGitHub = user.app_metadata?.providers?.includes('github') || 
                     user.identities?.some(i => i.provider === 'github');
    
    throw new Error(hasGitHub 
      ? 'Your GitHub connection has expired. Please reconnect.'
      : 'Please connect your GitHub account to continue.'
    );
  }

  static async invalidate(): Promise<void> {
    const user = await this.getCurrentUser();
    await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'github');
  }
}

export async function getGitHubClient(): Promise<Octokit> {
  const token = await TokenManager.retrieve();
  
  const octokit = new Octokit({
    auth: token,
    request: { timeout: CONFIG.API_TIMEOUT, retries: CONFIG.RETRY_COUNT }
  });

  try {
    await octokit.rest.users.getAuthenticated();
    return octokit;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const octokitError = error as { status?: number; message: string };
      if (octokitError.status === 401) {
        await TokenManager.invalidate();
        throw new Error('Your GitHub access has expired. Please reconnect.');
      }
      if (octokitError.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Try again later.');
      }
      throw new Error(`GitHub API error: ${octokitError.message}`);
    }
    throw new Error('An unknown error occurred while authenticating with GitHub');
  }
}

export async function getUserRepos(): Promise<GitHubRepo[]> {
  const octokit = await getGitHubClient();
  
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
      affiliation: 'owner,collaborator'
    });
    
    return data as GitHubRepo[];
  } catch (error: unknown) {
    console.error(error);
    
    const gitHubError = error as GitHubApiError;
    const status = gitHubError.status || gitHubError.response?.status;
    
    if (status === 401) {
        await TokenManager.invalidate();
        throw new Error('Your GitHub access has expired. Please reconnect.');
    }
    
    const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
    throw new Error(`Failed to fetch repositories: ${errorMessage}`);
}
}

export async function getRepoActivity(repo: GitHubRepo): Promise<GitHubActivity | null> {
  if (!repo.full_name) return null;
  
  try {
    const octokit = await getGitHubClient();
    const [owner, repoName] = repo.full_name.split('/');
    
    const { data: currentUser } = await octokit.rest.users.getAuthenticated();
    const username = currentUser.login.toLowerCase();

    const [commitsResponse, prsResponse] = await Promise.all([
      octokit.rest.repos.listCommits({
        owner,
        repo: repoName,
        per_page: 30,
        author: username
      }).catch(() => ({ data: [] })),
      
      octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 10
      }).catch(() => ({ data: [] }))
    ]);

    const commits = await Promise.all(
      commitsResponse.data
        .slice(0, 15)
        .map(async (commit: any) => {
          const files = await getCommitFiles(octokit, owner, repoName, commit.sha);
          return {
            sha: commit.sha,
            url: commit.html_url,
            date: commit.commit.author?.date || new Date().toISOString(),
            author: commit.author?.login || commit.commit.author?.name || null,
            message: commit.commit.message,
            files
          };
        })
    );

    const pullRequests = await Promise.all(
      prsResponse.data
        .filter((pr: any) => pr.user?.login?.toLowerCase() === username)
        .slice(0, 5)
        .map(async (pr: any) => {
          const files = await getPRFiles(octokit, owner, repoName, pr.number);
          return {
            id: pr.id,
            url: pr.html_url,
            user: pr.user?.login || null,
            state: pr.state,
            title: pr.title,
            number: pr.number,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            files
          };
        })
    );

    return { commits, pull_requests: pullRequests };
  } catch (error) {
    console.error(`Activity fetch failed for ${repo.full_name}:`, error);
    return null;
  }
}

async function getCommitFiles(octokit: Octokit, owner: string, repo: string, sha: string) {
  try {
    const { data: diff } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
      mediaType: { format: 'diff' }
    });
    
    return extractFileChanges(diff as unknown as string);
  } catch {
    return [];
  }
}

async function getPRFiles(octokit: Octokit, owner: string, repo: string, prNumber: number) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}.diff`,
      {
        headers: {
          'Authorization': `token ${await TokenManager.retrieve()}`,
          'Accept': 'application/vnd.github.v3.diff'
        }
      }
    );
    
    if (!response.ok) return [];
    const diff = await response.text();
    return extractFileChanges(diff);
  } catch {
    return [];
  }
}

function extractFileChanges(diff: string) {
  if (!diff) return [];
  
  const files: Array<{ fileName: string; original: string; changed: string }> = [];
  const fileSections = diff.split(/(?=diff --git)/);
  
  for (const section of fileSections) {
    const fileNameMatch = section.match(/diff --git a\/(.+?) b\/(.+)/);
    if (!fileNameMatch) continue;
    
    const fileName = fileNameMatch[2] || fileNameMatch[1];
    const lines = section.split('\n');
    let original = '';
    let changed = '';
    let inHunk = false;
    
    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }
      if (!inHunk || line.startsWith('diff --git') || line.startsWith('index ')) continue;
      
      if (line.startsWith('-') && !line.startsWith('---')) {
        original += line.substring(1) + '\n';
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        changed += line.substring(1) + '\n';
      } else if (line.startsWith(' ')) {
        const contextLine = line.substring(1) + '\n';
        original += contextLine;
        changed += contextLine;
      }
    }
    
    files.push({
      fileName,
      original: original.trim(),
      changed: changed.trim()
    });
  }
  
  return files;
}

export async function handleGitHubOAuthCallback(): Promise<boolean> {
  try {
    await new Promise(resolve => setTimeout(resolve, CONFIG.OAUTH_WAIT_TIME));
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token || !session.user) return false;
    
    await TokenManager.store(session.user.id, session.provider_token);
    
    await Promise.all([
      supabase.from('profiles').upsert({
        id: session.user.id,
        github_connected: true,
        updated_at: new Date().toISOString()
      }),
      supabase.from('user_onboarding').upsert({
        user_id: session.user.id,
        github_connected: true,
        updated_at: new Date().toISOString()
      })
    ]);
    
    return true;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return false;
  }
}

export async function hasGitHubConnection(): Promise<boolean> {
  try {
    await TokenManager.retrieve();
    return true;
  } catch {
    return false;
  }
}

export async function initGitHubOAuth(redirectUrl: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectUrl,
      scopes: CONFIG.SCOPES,
      skipBrowserRedirect: false
    }
  });
  
  if (error) throw error;
}