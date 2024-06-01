import type { Octokit } from '@octokit/rest';

export interface GithubCommonProps {
  octokit: Octokit;
  repoProps: {
    owner: string;
    repo: string;
  };
}
