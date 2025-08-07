'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Github, ExternalLink, Calendar, GitPullRequest, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { parsePRUrl, fetchPRData, analyzePR } from '@/lib/github-pr-analyzer';
import { PRData, PRStory } from '@/types/github';

export function PRAnalyzer() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prData, setPrData] = useState<PRData | null>(null);
  const [prStory, setPrStory] = useState<PRStory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePRFromUrl = async () => {
    if (!url.trim()) {
      toast.error('Please enter a GitHub PR URL');
      return;
    }

    const parsedUrl = parsePRUrl(url);
    if (!parsedUrl) {
      toast.error('Invalid GitHub PR URL. Please use format: https://github.com/owner/repo/pull/123');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrData(null);
    setPrStory(null);

    try {
      // Fetch PR data
      const data = await fetchPRData(parsedUrl.owner, parsedUrl.repo, parsedUrl.prNumber);
      setPrData(data);

      // Analyze with AI
      const story = await analyzePR(data);
      setPrStory(story);

      toast.success('PR analyzed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze PR';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzePRFromUrl();
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Github className="h-5 w-5" />
            <span>GitHub PR Analyzer</span>
          </CardTitle>
          <CardDescription>
            Paste a GitHub Pull Request URL to get an AI-powered analysis and story
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="url"
              placeholder="https://github.com/owner/repo/pull/123"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                'Analyze PR'
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PR Data Display */}
      {prData && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center space-x-2">
                  <GitPullRequest className="h-5 w-5" />
                  <span>{prData.title}</span>
                </CardTitle>
                <CardDescription className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>by {prData.author}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(prData.createdAt).toLocaleDateString()}</span>
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={prData.state === 'merged' ? 'default' : prData.state === 'closed' ? 'destructive' : 'secondary'}>
                  {prData.state}
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prData.description && (
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {prData.description.length > 300 
                    ? `${prData.description.substring(0, 300)}...` 
                    : prData.description
                  }
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">+{prData.additions}</div>
                <div className="text-xs text-green-700">Additions</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">-{prData.deletions}</div>
                <div className="text-xs text-red-700">Deletions</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{prData.changedFiles}</div>
                <div className="text-xs text-blue-700">Files Changed</div>
              </div>
            </div>

            {prData.labels.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {prData.labels.map((label) => (
                    <Badge key={label} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Story */}
      {prStory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>AI Analysis & Story</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{prStory.summary}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Technical Details</h4>
              <p className="text-sm text-muted-foreground">{prStory.technicalDetails}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Impact</h4>
              <p className="text-sm text-muted-foreground">{prStory.impact}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Key Changes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {prStory.keyChanges.map((change, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Badge variant={
                  prStory.complexity === 'high' ? 'destructive' : 
                  prStory.complexity === 'medium' ? 'default' : 'secondary'
                }>
                  {prStory.complexity} complexity
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {prStory.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}