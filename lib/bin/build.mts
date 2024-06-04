/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { buildBinaries } from '../build-binaries.mjs';
import { copyActionFiles, fixActionYml } from '../copy-action-files.js';
import { getOctokit } from '../github-common.js';
import { githubGetPrVersionLabel } from '../github-get-pr-labels.js';
import Joi from 'joi';
import { flowGitCloneReplaceAndCommit, getGitTagsByGlob } from '../git.js';
import {
  getLatestTagSemVer,
  getPRDevBranch,
  increaseSemver
} from '../version.js';
import semver from 'semver/preload.js';
import { setOutput } from '@actions/core';
import path from 'node:path';
import { actionsDir } from '../constants.js';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  pullNumber: number;
  release: boolean;
}

async function main() {
  const {
    _,
    promote: promoteFlag,
    inline,
    ...rest
  } = minimist(process.argv.slice(2), {
    boolean: ['promote', 'release', 'inline'],
    string: ['token', 'repository', 'pullNumber']
  });

  const opts = promoteFlag
    ? (Joi.attempt(
        rest,
        Joi.object({
          token: Joi.string().required(),
          repository: Joi.string().required(),
          pullNumber: Joi.number().required(),
          release: Joi.boolean().required()
        }).required(),
        {
          allowUnknown: true
        }
      ) as Opts)
    : undefined;

  const actionName = _[0].split('/').reverse()[0];
  const mappedBinaries = await buildBinaries(actionName);

  if (opts) {
    await flow(actionName, opts, mappedBinaries);
  } else if (inline) {
    console.log('Fixing action.yml inline');
    await fixActionYml(path.join(actionsDir, actionName), mappedBinaries);
  }
}

async function flow(
  actionName: string,
  { token, repository, pullNumber, release }: Opts,
  mappedBinaries: Record<string, string>
) {
  const gh = getOctokit(repository, token);

  const versionLabel = await githubGetPrVersionLabel({
    gh,
    pullNumber
  });
  if (versionLabel == null) {
    console.log('No version label found. Not proceeding with promote flow.');
    return;
  }

  const contentsDir = await copyActionFiles(actionName, mappedBinaries);

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

  const newSemVer = increaseSemver(latestSemVer, versionLabel);
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

void main();
