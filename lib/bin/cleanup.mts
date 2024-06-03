import 'zx/globals';
import { getOctokit } from '../github-common.js';
import Joi from 'joi';
import { getPRDevBranchGlob } from '../version.js';
import { getGitRemoteBranchesByGlob } from '../git.js';
import { inspect } from '../inspect.js';

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

  await flow(opts);
}

async function flow({ token, repository, pullNumber }: Opts) {
  const gh = getOctokit(repository, token);

  // Fetch all remote branches
  await $`git fetch origin`;

  // Delete any dev branches created via the PR
  const versionBranchGlob = getPRDevBranchGlob(pullNumber);
  const branches = await getGitRemoteBranchesByGlob(versionBranchGlob);
  console.log(`Found remote dev branches: ${inspect(branches)}`);

  for (const versionBranch of branches) {
    try {
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
          continue;
        }
        throw err;
      }

      console.log(`Deleting dev branch ${versionBranch}`);

      await gh.octokit.rest.git.deleteRef({
        ...gh.repoProps,
        ref: `heads/${versionBranch}`
      });
    } catch (err) {
      console.error(`Failed to delete dev branch ${versionBranch}`, err);
    }
  }
}

void main();
