/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';
import type { TestPayload } from './ci-shared.js';

export async function ciPostTest({
  gh,
  needs,
  payload,
  runId
}: {
  gh: GithubCommonProps;
  needs: object;
  payload: TestPayload;
  runId: number;
}) {
  // Find at least one failed job in the "needs" context
  const anyFailed =
    Object.entries(needs).find(([k, v]) => v.result == 'failure') != null;

  const url = `https://github.com/${gh.repoProps.owner}/${gh.repoProps.repo}/actions/runs/${runId}`;

  // Finalize the status for the workflow
  await gh.octokit.rest.repos.createCommitStatus({
    ...gh.repoProps,
    context: payload.statusContext,
    state: anyFailed ? 'failure' : 'success',
    sha: payload.sha,
    target_url: url
  });
}
