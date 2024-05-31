import 'zx/globals';
import path from 'node:path';
import { rootDir } from './constants.js';
import { VersionLabel } from './version.js';

export async function getGitTagsByGlob(glob: string): Promise<string[]> {
  const out =
    await $`git describe --tags --abbrev=0 --match=${glob} HEAD`.nothrow();
  if (out.exitCode ?? 0 > 0) {
    if (out.stderr.includes('No names found, cannot describe anything.'))
      return [];
    throw new Error(`Bad git exit code ${out.exitCode}`);
  }

  return out.stdout.split('\n').filter((l) => l.trim() != '');
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
    await fs.copy(contentsDir, tmpDir);

    await $`git add .`;

    await $`git branch -f ${branchName}`;
    await $`git checkout ${branchName}`;

    const commitMessage = `[${versionLabel}] ${tag}`;
    await $`git commit -m ${commitMessage}`;
    await $`git tag ${tag}`;
  });

  return tmpDir;
}
