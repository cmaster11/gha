import 'zx/globals';
import { Octokit } from '@octokit/rest';
import type { GithubCommonProps } from '../github-common.js';
import Joi from 'joi';
import { getPRDevBranch } from '../version.js';
import { inspect } from '../inspect.js';

$.verbose = true;

interface CleanupOpts {
  token: string;
  repository: string;
  pullNumber: number;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    string: ['token', 'repository', 'pullNumber']
  });

  const cleanupOpts = Joi.attempt(
    rest,
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      pullNumber: Joi.number().required()
    }).required(),
    {
      allowUnknown: true
    }
  ) as CleanupOpts;

  const actionName = _[0].split('/').reverse()[0];
  await cleanupFlow(actionName, cleanupOpts);
}

async function cleanupFlow(
  actionName: string,
  { token, repository, pullNumber }: CleanupOpts
) {
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

  // Delete any dev branch created via the PR
  const versionBranch = getPRDevBranch(actionName, pullNumber);

  try {
    await octokit.rest.git.getRef({
      ...gh.repoProps,
      ref: `heads/${versionBranch}`
    });
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any
  ) {
    if ('status' in err && err.status == 404) {
      // Ok!
      console.log('Branch not found, all good!');
      return;
    }
    throw err;
  }

  console.log(`Deleting dev branch ${versionBranch}`);

  await octokit.rest.git.deleteRef({
    ...gh.repoProps,
    ref: `heads/${versionBranch}`
  });
}

void main();
