/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';
import type { ReleaseLabel } from '../version.js';

import { copyWorkflowFiles } from '../copy-workflow-files.js';
import { releaseVersionBranch } from '../release-version-branch.js';

export async function ciBuildWorkflows(opts: {
  workflowName: string;
  gh: GithubCommonProps;
  pullNumber: number;
  releaseLabel: ReleaseLabel;
  release: boolean;
}) {
  const { workflowName } = opts;

  const contentsDir = await copyWorkflowFiles(workflowName);

  const { release, pullNumber, releaseLabel } = opts;
  await releaseVersionBranch(
    release,
    workflowName,
    pullNumber,
    contentsDir,
    releaseLabel
  );
}
