/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { getOctokit } from '../github-common.js';
import Joi from 'joi';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  versionBranch: string;
  headRef: string;
  headSHA: string;
  release: boolean;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    boolean: ['release'],
    string: ['token', 'repository', 'versionBranch', 'headRef', 'headSHA']
  });

  const opts = Joi.attempt(
    rest,
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      versionBranch: Joi.string().required(),
      headRef: Joi.string().required(),
      headSHA: Joi.string().required(),
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
  { token, repository, versionBranch, release, headRef, headSHA }: Opts
) {
  const gh = getOctokit(repository, token);

  const ref = release ? 'main' : headRef;
  const workflowName = `test-${actionName}.yml`;

  // Check if there is a workflow to trigger
  try {
    await gh.octokit.rest.repos.getContent({
      ...gh.repoProps,
      ref: headSHA,
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

  // Create the status check for the upcoming test workflow
  const statusContext = `CI Test: ${actionName}`;
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: statusContext,
    state: 'pending',
    sha: headSHA
  });

  // Trigger the test workflow
  await gh.octokit.rest.actions.createWorkflowDispatch({
    ...gh.repoProps,
    workflow_id: workflowName,
    ref,
    inputs: {
      ctx: JSON.stringify({
        ref: versionBranch,
        statusContext
      })
    }
  });
}

void main();
