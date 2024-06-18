/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { GithubCommonProps } from '../github-common.js';

export const ciTestCatchAllWorkflowName = 'ci-test-catch-all.yml';

export const actionsRemapping = {
  './actions/action-git-init-userinfo': 'action-git-init-userinfo/v0',
  '${{ steps.ci-build-inline.outputs.out-dir }}': 'action-ci-build/v0'
};

export interface TestPayload {
  sha: string;
  ref: string;
  statusContext: string;
  pullNumber: number;
}

export async function createCommitStatusAndTriggerTestWorkflow({
  gh,
  statusContext,
  testWorkflowName,
  headSHA,
  versionBranch,
  pullNumber,
  ref
}: {
  gh: GithubCommonProps;
  statusContext: string;
  testWorkflowName: string;
  headSHA: string;
  versionBranch: string;
  pullNumber: number;
  ref: string;
}) {
  // Create the status check for the upcoming test workflow
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: statusContext,
    state: 'pending',
    sha: headSHA
  });

  // Trigger the test workflow
  const payload: TestPayload = {
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
      'workflow-name': testWorkflowName,
      'test-ctx': JSON.stringify(payload)
    }
  });
}
