/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { GithubCommonProps } from '../github-common.js';

export const ciTestCatchAllWorkflowName = 'ci-test-catch-all.yml';

export interface TestPayload {
  testWorkflowName: string;
  sha: string;
  ref: string;
  statusContext: string;
  pullNumber: number;
}

export async function createCommitStatusAndTriggerTestWorkflow(
  gh: GithubCommonProps,
  statusContext: string,
  testWorkflowName: string,
  headSHA: string,
  versionBranch: string,
  pullNumber: number,
  ref: string
) {
  // Create the status check for the upcoming test workflow
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: statusContext,
    state: 'pending',
    sha: headSHA
  });

  // Trigger the test workflow
  const payload: TestPayload = {
    testWorkflowName,
    ref: versionBranch,
    sha: headSHA,
    statusContext,
    pullNumber
  };
  await gh.octokit.rest.actions.createWorkflowDispatch({
    ...gh.repoProps,
    workflow_id: ciTestCatchAllWorkflowName,
    ref,
    inputs: {
      'test-ctx': JSON.stringify(payload)
    }
  });
}
