/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { buildBinaries } from '../build-binaries.js';
import { copyActionFiles } from '../copy-action-files.js';
import type { GithubCommonProps } from '../github-common.js';
import type { ReleaseLabel } from '../version.js';
import { isScriptInvokedDirectly } from '../esm.js';
import { releaseVersionBranch } from '../release-version-branch.js';
import path from 'node:path';
import { ghaCIBuildInlineTmpDir } from '../constants.js';

export async function ciBuildActions(
  opts:
    | {
        actionName: string;
        inline: true;
      }
    | {
        actionName: string;
        gh: GithubCommonProps;
        pullNumber: number;
        releaseLabel: ReleaseLabel;
        release: boolean;
      }
) {
  const { actionName } = opts;

  const mappedBinaries = await buildBinaries(actionName);
  const outDir = await copyActionFiles(
    actionName,
    mappedBinaries,
    'inline' in opts ? path.join(ghaCIBuildInlineTmpDir, actionName) : undefined
  );

  if ('inline' in opts) {
    return;
  }

  const { release, pullNumber, releaseLabel } = opts;

  await releaseVersionBranch(
    release,
    actionName,
    pullNumber,
    outDir,
    releaseLabel
  );
}

if (isScriptInvokedDirectly(import.meta)) {
  $.verbose = true;
  const { _, inline } = minimist(process.argv.slice(2), {
    boolean: ['inline']
  });
  if (inline) {
    const actionName = _[0].split('/').reverse()[0];
    void ciBuildActions({
      inline,
      actionName
    });
  }
}
