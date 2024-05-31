import 'zx/globals';
import { buildBinaries } from '../lib/build-binaries.js';
import path from 'node:path';
import { copyActionFiles } from '../lib/copy-action-files.js';
import { Octokit } from '@octokit/rest';
import { GithubCommonProps } from '../lib/github-common.js';
import {
  githubGetPrLabels,
  githubGetPrVersionLabel
} from '../lib/github-get-pr-labels.js';
import Joi from 'joi';
import { flowGitCloneReplaceAndCommit, getGitTagsByGlob } from '../lib/git.js';
import { rootDir } from '../lib/constants.js';
import {
  getLatestTagSemVer,
  increaseSemver,
  semverSort,
  semverSortDesc
} from '../lib/version.js';
import semver from 'semver/preload.js';

interface PromoteOpts {
  token: string;
  owner: string;
  repo: string;
  pullNumber: number;
}

async function main() {
  const {
    _,
    promote: promoteFlag,
    ...rest
  } = minimist(process.argv.slice(2), {
    boolean: ['promote']
  });

  const promoteOpts = promoteFlag
    ? (Joi.attempt(
        rest,
        Joi.object({
          token: Joi.string().required(),
          owner: Joi.string().required(),
          repo: Joi.string().required(),
          pullNumber: Joi.number().required()
        }).required()
      ) as PromoteOpts)
    : undefined;

  let actionToBuild = _[0];
  if (path.isAbsolute(actionToBuild)) {
    actionToBuild = path.relative(rootDir, actionToBuild);
  } else if (!actionToBuild.startsWith('actions/')) {
    actionToBuild = 'actions/' + actionToBuild;
  }

  const actionToBuildDirFullPath = path.join(rootDir, actionToBuild);
  await buildBinaries(actionToBuildDirFullPath);

  if (promoteOpts) {
    await promoteFlow(actionToBuildDirFullPath, promoteOpts);
  }
}

async function promoteFlow(
  actionName: string,
  { token, owner, repo, pullNumber }: PromoteOpts
) {
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

  const tagPrefix = actionName + '-v';
  const tags = await getGitTagsByGlob(tagPrefix + '*');
  const latestSemVer = getLatestTagSemVer(tags, tagPrefix);
  const newSemVer = increaseSemver(latestSemVer, versionLabel);
  const versionBranch = tagPrefix + semver.major(newSemVer);
  const newTag = tagPrefix + newSemVer;
  console.log(
    `Proceeding with new version tag ${newTag} and version branch ${versionBranch}`
  );

  const contentsDir = await copyActionFiles(actionName);
  const newBranchDir = await flowGitCloneReplaceAndCommit(
    versionBranch,
    versionLabel,
    newTag,
    contentsDir
  );
}

void main();
