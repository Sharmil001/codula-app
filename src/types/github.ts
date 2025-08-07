import type { RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubCommitData =
  RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][0];
export type GitHubPullRequest =
  RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0];
export type GitHubUser =
  RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"];

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  pushed_at: string;
  activity_data?: GitHubActivity;
}

export interface GitHubActivity {
  commits: Array<{
    sha: string;
    url: string;
    date: string;
    author: string | null;
    message: string;
    files: Array<{
      fileName: string;
      original: string;
      changed: string;
    }>;
  }>;
  pull_requests: Array<{
    id: number;
    url: string;
    user: string | null;
    state: string;
    title: string;
    number: number;
    closed_at: string | null;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    files: Array<{
      fileName: string;
      original: string;
      changed: string;
    }>;
  }>;
}

export interface GitHubApiError extends Error {
  status?: number;
  response?: {
    status: number;
    data: unknown;
  };
}


export interface PRData {
    title: string;
    description: string;
    author: string;
    state: 'open' | 'closed' | 'merged';
    createdAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    additions: number;
    deletions: number;
    changedFiles: number;
    commits: Array<{
      message: string;
      author: string;
      date: string;
    }>;
    files: Array<{
      filename: string;
      status: 'added' | 'modified' | 'removed' | 'renamed';
      additions: number;
      deletions: number;
      patch?: string;
    }>;
    reviewComments: Array<{
      author: string;
      body: string;
      createdAt: string;
    }>;
    labels: string[];
    linkedIssues: string[];
  }
  
  export interface PRStory {
    summary: string;
    technicalDetails: string;
    impact: string;
    keyChanges: string[];
    complexity: 'low' | 'medium' | 'high';
    tags: string[];
  }
  