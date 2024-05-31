import 'zx/globals';
import { buildBinaries } from '../build-binaries.mjs';
import { copyActionFiles } from '../copy-action-files.js';
import { Octokit } from '@octokit/rest';
import type { GithubCommonProps } from '../github-common.js';
import { githubGetPrVersionLabel } from '../github-get-pr-labels.js';
import Joi from 'joi';
import { flowGitCloneReplaceAndCommit, getGitTagsByGlob } from '../git.js';
import { getLatestTagSemVer, increaseSemver } from '../version.js';
import semver from 'semver/preload.js';

$.verbose = true;

interface PromoteOpts {
  token: string;
  repository: string;
  pullNumber: number;
  push: boolean;
}

async function main() {
  const {
    _,
    promote: promoteFlag,
    ...rest
  } = minimist(process.argv.slice(2), {
    boolean: ['promote', 'push'],
    string: ['token', 'repository', 'pullNumber']
  });

  const promoteOpts = promoteFlag
    ? (Joi.attempt(
        rest,
        Joi.object({
          token: Joi.string().required(),
          repository: Joi.string().required(),
          pullNumber: Joi.number().required(),
          push: Joi.boolean().required()
        }).required(),
        {
          allowUnknown: true
        }
      ) as PromoteOpts)
    : undefined;

  const actionName = _[0].split('/').reverse()[0];
  await buildBinaries(actionName);

  if (promoteOpts) {
    await promoteFlow(actionName, promoteOpts);
  }
}

async function promoteFlow(
  actionName: string,
  { token, repository, pullNumber, push }: PromoteOpts
) {
  await $`git fetch --tags`;

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

  if (push) {
    const pushShell = $({ cwd: newBranchDir });
    await pushShell`git push origin ${versionBranch}`;
    await pushShell`git push origin tag ${newTag}`;
  }
}

void main();
