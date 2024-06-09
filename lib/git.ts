/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';

export async function getGitTagsByGlob(glob: string): Promise<string[]> {
  const out = (await $`git tag -l ${glob}`).stdout;
  return out.split('\n').filter((l) => l.trim() != '');
}

export async function getGitRemoteBranchesByGlob(
  glob: string
): Promise<string[]> {
  const out = (await $`git branch -r -l origin/${glob}`).stdout;
  return out
    .split('\n')
    .filter((l) => l.trim() != '')
    .map((b) => b.trim().replace(/^origin\//, ''));
}

export async function gitDiffLines(baseSHA: string) {
  return (await $`git diff --name-status ${baseSHA}`).stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      return /^(R\w*)\s+(?:\S.+)\s+(\S.+)|^(\w+)\s+(\S.+)$/.exec(line);
    })
    .filter((arr) => arr != null)
    .map((arr) =>
      arr![1]
        ? [
            // Git status
            arr![1],
            // Path
            arr![2]
          ]
        : [
            // Git status
            arr![3],
            // Path
            arr![4]
          ]
    );
}
