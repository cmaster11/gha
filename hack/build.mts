import 'zx/globals';
import { buildBinaries } from '../lib/build-binaries.mjs';
import path from 'node:path';
import { copyActionFiles } from '../lib/copy-action-files.mjs';
import { Octokit } from '@octokit/rest';
import { GithubCommonProps } from '../lib/github-common.js';
import {
  githubGetPrLabels,
  githubGetPrVersionLabel
} from '../lib/github-get-pr-labels.mjs';
import Joi from 'joi';

const __dirname = import.meta.dirname;
const rootDir = path.join(__dirname, '..');

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
  actionDir: string,
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
  }

  // TODO find the oldest version tag and bump it up

  const tmpDir = await copyActionFiles(actionDir);
}

void main();
