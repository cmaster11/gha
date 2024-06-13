/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';
import { createCommitStatusAndTriggerTestWorkflow } from './ci-shared.js';

export async function ciPostBuildTestActions({
  gh,
  actionName,
  pullNumber,
  versionBranch,
  headSHA,
  headRef,
  release
}: {
  gh: GithubCommonProps;
  actionName: string;
  pullNumber: number;
  versionBranch: string;
  headRef: string;
  headSHA: string;
  release: boolean;
}) {
  const ref = release ? 'main' : headRef;
  const testWorkflowName = `test-${actionName}.yml`;

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

  const statusContext = `CI Test: ${actionName}`;
  await createCommitStatusAndTriggerTestWorkflow(
    gh,
    statusContext,
    headSHA,
    testWorkflowName,
    versionBranch,
    pullNumber,
    ref
  );
}
