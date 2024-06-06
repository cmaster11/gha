/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';
import { rootDir } from './constants.js';

export async function flowGitCloneReplaceAndCommit(
  branchName: string,
  contentsDir: string,
  commitMessage: string,
  tag?: string
): Promise<string> {
  // Clone the current repo
  const tmpDir = tmpdir();
  console.log(
    `[flowGitCloneReplaceAndCommit] Executing in directory ${tmpDir}`
  );

  // Clone the local git repo dr
  await fs.copy(path.join(rootDir, '.git'), path.join(tmpDir, '.git'));

  await within(async () => {
    cd(tmpDir);

    // If there is already a version branch, restore it, so we can
    // have a nice commit history
    await $`git fetch origin ${branchName}:${branchName} && git checkout ${branchName}`.catch(
      () => $`git checkout -B ${branchName}`
    );

    await fs.copy(contentsDir, tmpDir);

    // Make sure to always create a new commit
    await fs.writeFile('.timestamp', new Date().getTime().toString());

    await $`git add .`;

    await $`git commit -m ${commitMessage}`;
    if (tag) {
      await $`git tag ${tag}`;
    }

    await $`ls -al`;
    await $`git show --name-status`;
  });

  return tmpDir;
}
