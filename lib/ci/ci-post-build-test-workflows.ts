/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';
import { createCommitStatusAndTriggerTestWorkflow } from './ci-shared.js';

export async function ciPostBuildTestWorkflows({
  gh,
  workflowName,
  pullNumber,
  versionBranch,
  headSHA,
  headRef,
  release
}: {
  gh: GithubCommonProps;
  workflowName: string;
  pullNumber: number;
  versionBranch: string;
  headRef: string;
  headSHA: string;
  release: boolean;
}) {
  const ref = release ? 'main' : headRef;
  const testWorkflowName = `test-${workflowName}.yml`;

  // Check if there is a workflow to trigger
  try {
    await gh.octokit.rest.repos.getContent({
      ...gh.repoProps,
      ref: headSHA,
      path: `.github/workflows/${testWorkflowName}`
    });
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any
  ) {
    if (err.response.status === 404) {
      console.log('No workflow to trigger could be found, exiting');
      return;
    }
    throw err;
  }

  // Create the status check for the upcoming test workflow
  const commitStatusContext = `CI Test: ${workflowName}`;
  await createCommitStatusAndTriggerTestWorkflow({
    gh,
    commitStatusContext,
    headSHA,
    testWorkflowName,
    versionBranch,
    pullNumber,
    ref
  });
}
