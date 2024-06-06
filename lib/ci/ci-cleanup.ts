/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import type { GithubCommonProps } from '../github-common.js';
import { getPRDevBranchGlob } from '../version.js';
import { getGitRemoteBranchesByGlob } from '../git.js';
import { inspect } from '../inspect.js';

export async function ciCleanup({
  gh,
  pullNumber
}: {
  gh: GithubCommonProps;
  pullNumber: number;
}) {
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
