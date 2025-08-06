export interface OnboardingState {
  user_id: string;
  github_connected: boolean;
  repos_selected: boolean;
  twitter_added: boolean;
  skills_added: boolean;
  completed_steps: number[];
}
