/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { GithubCommonProps } from '../github-common.js';
import type { TestPayload } from './ci-shared-test-payload.js';

export const ciTestCatchAllWorkflowName = 'ci-test-catch-all.yml';

export const actionsRemapping = {
  './actions/action-git-init-userinfo': 'action-git-init-userinfo/v0',
  './tmp-inline/action-ci-build': 'action-ci-build/v0'
};
export const workflowsRemapping = {
  './.github/workflows/gen-wf-build.yml':
    'cmaster11/gha/.github/workflows/wf-build.yml@wf-build/v1',
  './.github/workflows/gen-wf-pr-opened.yml':
    'cmaster11/gha/.github/workflows/wf-pr-opened.yml@wf-pr-opened/v1'
};

export async function createCommitStatusAndTriggerTestWorkflow({
  gh,
  commitStatusContext,
  testWorkflowName,
  headSHA,
  versionBranch,
  pullNumber,
  ref
}: {
  gh: GithubCommonProps;
  commitStatusContext: string;
  testWorkflowName: string;
  headSHA: string;
  versionBranch: string;
  pullNumber: number;
  ref: string;
}) {
  // Create the status check for the upcoming test workflow
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: commitStatusContext,
    state: 'pending',
    sha: headSHA
  });

  // Trigger the test workflow
  const payload: TestPayload = {
    ref: versionBranch,
    sha: headSHA,
    commitStatusContext,
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
