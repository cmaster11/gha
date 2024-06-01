import 'zx/globals';
import { getOctokit } from '../github-common.js';
import Joi from 'joi';
import { getPRDevBranch } from '../version.js';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  pullNumber: number;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    string: ['token', 'repository', 'pullNumber']
  });

  const opts = Joi.attempt(
    rest,
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      pullNumber: Joi.number().required()
    }).required(),
    {
      allowUnknown: true
    }
  ) as Opts;

  const actionName = _[0].split('/').reverse()[0];
  await flow(actionName, opts);
}

async function flow(
  actionName: string,
  { token, repository, pullNumber }: Opts
) {
  const gh = getOctokit(repository, token);

  // Delete any dev branch created via the PR
  const versionBranch = getPRDevBranch(actionName, pullNumber);

  try {
    await gh.octokit.rest.git.getRef({
      ...gh.repoProps,
      ref: `heads/${versionBranch}`
    });
  } catch (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any
  ) {
    if ('status' in err && err.status == 404) {
      // Ok!
      console.log('Branch not found, all good!');
      return;
    }
    throw err;
  }

  console.log(`Deleting dev branch ${versionBranch}`);

  await gh.octokit.rest.git.deleteRef({
    ...gh.repoProps,
    ref: `heads/${versionBranch}`
  });
}

void main();
