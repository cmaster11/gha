/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';

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
  const testWorkflowName = `test-${workflowName}`;

  // Check if there is a workflow to trigger
  try {
    await gh.octokit.rest.repos.getContent({
      ...gh.repoProps,
      ref: headSHA,
      path: `.github/workflows/${testWorkflowName}.yml`
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
  const statusContext = `CI Test: ${workflowName}`;
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: statusContext,
    state: 'pending',
    sha: headSHA
  });

  // Trigger the test workflow
  await gh.octokit.rest.actions.createWorkflowDispatch({
    ...gh.repoProps,
    workflow_id: testWorkflowName,
    ref,
    inputs: {
      ctx: JSON.stringify({
        ref: versionBranch,
        statusContext,
        pullNumber
      })
    }
  });
}
