import { Octokit } from '@octokit/rest';

export interface GithubCommonProps {
  octokit: Octokit;
  repoProps: {
    owner: string;
    repo: string;
  };
}

export function getOctokit(repository: string, token: string) {
  const [owner, repo] = repository.split('/');
  const octokit = new Octokit({
    auth: token
  });
  const gh: GithubCommonProps = {
    octokit,
    repoProps: {
      owner,
      repo
    }
  };
  return gh;
}
