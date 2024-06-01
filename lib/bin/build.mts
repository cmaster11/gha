import 'zx/globals';
import { buildBinaries } from '../build-binaries.mjs';
import { copyActionFiles } from '../copy-action-files.js';
import { Octokit } from '@octokit/rest';
import type { GithubCommonProps } from '../github-common.js';
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
    ...rest
  } = minimist(process.argv.slice(2), {
    boolean: ['promote', 'release'],
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
  await buildBinaries(actionName);

  if (opts) {
    await flow(actionName, opts);
  }
}

async function flow(
  actionName: string,
  { token, repository, pullNumber, release }: Opts
) {
  const [owner, repo] = repository.split('/');
  const octokit = new Octokit({
    auth: token
  });
  const gh: GithubCommonProps = {
    octokit,
    repoProps: {
      owner,
      repo
    }
  };

  const versionLabel = await githubGetPrVersionLabel({
    gh,
    pullNumber
  });
  if (versionLabel == null) {
    console.log('No version label found. Not proceeding with promote flow.');
    return;
  }

  const contentsDir = await copyActionFiles(actionName);

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
