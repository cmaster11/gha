/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { buildBinaries } from '../build-binaries.js';
import { copyActionFiles, fixActionYml } from '../copy-action-files.js';
import type { GithubCommonProps } from '../github-common.js';
import { getGitTagsByGlob } from '../git.js';
import type { ReleaseLabel } from '../version.js';
import {
  getLatestTagSemVer,
  getPRDevBranch,
  increaseSemver
} from '../version.js';
import semver from 'semver/preload.js';
import { setOutput } from '@actions/core';
import path from 'node:path';
import { actionsDir } from '../constants.js';
import { flowGitCloneReplaceAndCommit } from '../git-clone-and-replace.js';
import { isScriptInvokedDirectly } from '../esm.js';

export async function ciBuild(
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
  const contentsDir = await copyActionFiles(actionName, mappedBinaries);

  if ('inline' in opts) {
    console.log('Fixing action.yml inline');
    await fixActionYml(path.join(actionsDir, actionName), mappedBinaries);
    return;
  }

  const { release, pullNumber, releaseLabel } = opts;

  // If we are NOT releasing a new version, just generate a dev branch
  if (!release) {
    const versionBranch = getPRDevBranch(actionName, pullNumber);
    console.log(`Proceeding with dev version branch ${versionBranch}`);
    const newBranchDir = await flowGitCloneReplaceAndCommit(
      versionBranch,
      contentsDir,
      `[${versionBranch}] ${new Date().toISOString()}`
    );

    const pushShell = $({ cwd: newBranchDir });
    await pushShell`git push origin ${versionBranch}`;
    setOutput('version-branch', versionBranch);
    return;
  }

  // On release, generate a tag and a major-version branch
  await $`git fetch --tags`;
  const tagPrefix = actionName + '/v';
  const tags = await getGitTagsByGlob(tagPrefix + '*');
  const latestSemVer = getLatestTagSemVer(tags, tagPrefix);

  const newSemVer = increaseSemver(latestSemVer, releaseLabel);
  const versionBranch = tagPrefix + semver.major(newSemVer);
  const newTag = tagPrefix + newSemVer;
  console.log(
    `Proceeding with new version tag ${newTag} and version branch ${versionBranch}`
  );
  const newBranchDir = await flowGitCloneReplaceAndCommit(
    versionBranch,
    contentsDir,
    `[${versionBranch}] ${newTag}`,
    newTag
  );

  const pushShell = $({ cwd: newBranchDir });
  await pushShell`git push origin ${versionBranch}`;
  await pushShell`git push origin tag ${newTag}`;
  setOutput('version-branch', versionBranch);
}

if (isScriptInvokedDirectly(import.meta)) {
  $.verbose = true;
  const { _, inline } = minimist(process.argv.slice(2), {
    boolean: ['inline']
  });
  if (inline) {
    const actionName = _[0].split('/').reverse()[0];
    void ciBuild({
      inline,
      actionName
    });
  }
}
