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
  activity_data?: any;
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
        data: any;
    };
}