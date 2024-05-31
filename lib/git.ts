import 'zx/globals';
import path from 'node:path';
import { rootDir } from './constants.js';
import type { VersionLabel } from './version.js';

export async function getGitTagsByGlob(glob: string): Promise<string[]> {
  const out = (await $`git tag -l ${glob}`).stdout;
  return out.split('\n').filter((l) => l.trim() != '');
}

export async function flowGitCloneReplaceAndCommit(
  branchName: string,
  versionLabel: VersionLabel,
  tag: string,
  contentsDir: string
): Promise<string> {
  // Clone the current repo
  const tmpDir = tmpdir();
  console.log(
    `[flowGitCloneReplaceAndCommit] Executing in directory ${tmpDir}`
  );

  await within(async () => {
    cd(tmpDir);

    await fs.copy(path.join(rootDir, '.git'), path.join(tmpDir, '.git'));

    // If there is already a version branch, restore it, so we can
    // have a nice commit history
    await $`git fetch origin ${branchName}:${branchName} && git checkout ${branchName}`.catch(
      () => $`git checkout -B ${branchName}`
    );

    await fs.copy(contentsDir, tmpDir);

    // Make sure to always create a new commit
    await fs.writeFile(tmpDir + '/.timestamp', new Date().getTime().toString());

    await $`git add .`;

    const commitMessage = `[${versionLabel}] ${tag}`;
    await $`git commit -m ${commitMessage}`;
    await $`git tag ${tag}`;

    await $`ls -al`;
    await $`git show --name-status`;
  });

  return tmpDir;
}
