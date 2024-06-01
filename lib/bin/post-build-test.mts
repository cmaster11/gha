import 'zx/globals';
import { Octokit } from '@octokit/rest';
import type { GithubCommonProps } from '../github-common.js';
import Joi from 'joi';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  versionBranch: string;
  headRef: string;
  release: boolean;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    boolean: ['release'],
    string: ['token', 'repository', 'versionBranch', 'headRef']
  });

  const opts = Joi.attempt(
    rest,
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      versionBranch: Joi.string().required(),
      headRef: Joi.string().required(),
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
  { token, repository, versionBranch, release, headRef }: Opts
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

  const ref = release ? 'main' : headRef;
  const workflowName = `test-${actionName}.yml`;

  // Check if there is a workflow to trigger
  try {
    await octokit.rest.repos.getContent({
      ...gh.repoProps,
      ref,
      path: `.github/workflows/${workflowName}`
    });
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any
  ) {
    if (err.response.status === 404) {
      // No workflow to trigger
      return;
    }
    throw err;
  }

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
