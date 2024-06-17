/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { Octokit } from '@octokit/rest';

export interface GithubCommonProps {
  token: string;
  octokit: Octokit;
  repoProps: {
    owner: string;
    repo: string;
  };
}

export function getOctokit(repository: string, token: string) {
  const [owner, repo] = repository.split('/');
  return getOctokitWithOwnerAndRepo(owner, repo, token);
}

export function getOctokitWithOwnerAndRepo(
  owner: string,
  repo: string,
  token: string
) {
  const octokit = new Octokit({
    auth: token
  });
  const gh: GithubCommonProps = {
    token,
    octokit,
    repoProps: {
      owner,
      repo
    }
  };
  return gh;
}
