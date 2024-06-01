import 'zx/globals';
import { Octokit } from '@octokit/rest';
import type { GithubCommonProps } from '../github-common.js';
import Joi from 'joi';
import { getPRDevBranch } from '../version.js';
import path from 'node:path';
import { rootDir } from '../constants.js';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  versionBranch: string;
  pullNumber: number;
  release: boolean;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    boolean: ['release'],
    string: ['token', 'repository', 'versionBranch', 'pullNumber']
  });

  const opts = Joi.attempt(
    rest,
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      versionBranch: Joi.string().required(),
      pullNumber: Joi.number().required(),
      release: Joi.boolean().required()
    }).required(),
    {
      allowUnknown: true
    }
  ) as Opts;

  const actionName = _[0].split('/').reverse()[0];
  await flow(actionName, opts);
}

async function flow(
  actionName: string,
  { token, repository, versionBranch, pullNumber, release }: Opts
) {
  const workflowName = `test-${actionName}.yml`;
  if (
    !(await fs.exists(path.join(rootDir, '.github', 'workflows', workflowName)))
  ) {
    console.log('No test workflow found');
    return;
  }

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

  const ref = release ? 'main' : getPRDevBranch(actionName, pullNumber);

  await octokit.rest.actions.createWorkflowDispatch({
    ...gh.repoProps,
    workflow_id: workflowName,
    ref,
    inputs: {
      ref: versionBranch
    }
  });
}

void main();
