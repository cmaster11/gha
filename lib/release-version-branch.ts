/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { ReleaseLabel } from './version.js';
import {
  getLatestTagSemVer,
  getPRDevBranch,
  increaseSemver
} from './version.js';
import { flowGitCloneReplaceAndCommit } from './git-clone-and-replace.js';
import { setOutput } from '@actions/core';
import { getGitTagsByGlob } from './git.js';
import semver from 'semver/preload.js';

export async function releaseVersionBranch(
  release: boolean,
  elementName: string,
  pullNumber: number,
  contentsDir: string,
  releaseLabel: ReleaseLabel
) {
  // If we are NOT releasing a new version, just generate a dev branch
  if (!release) {
    const versionBranch = getPRDevBranch(elementName, pullNumber);
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
  const tagPrefix = elementName + '/v';
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
