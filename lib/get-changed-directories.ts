import * as path from 'node:path';
import 'zx/globals';

export interface GetChangedDirectoriesOpts {
  baseSHA: string;
  directoryRegex?: RegExp;
  maxDepth?: number;
  ignoreIfAllDeletions?: boolean;
}

export async function getChangedDirectories({
  baseSHA,
  directoryRegex,
  maxDepth,
  ignoreIfAllDeletions
}: GetChangedDirectoriesOpts) {
  directoryRegex ??= /.*/;
  maxDepth ??= 0;

  const lineRegex = /^(\w+)\s+(\S.+)$/;

  const diffLines = (await $`git diff --name-status ${baseSHA}`).stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => lineRegex.exec(line))
    .filter((arr) => arr != null)
    .map((arr) => [arr![1], arr![2]])
    .filter(([, p]) => directoryRegex.test(p));

  // Composes an object where the key is the directory and the value is `true` if at least 1 file was NOT deleted
  const aggregatedChanges = diffLines
    .map(([s, p]) => [s, path.dirname(p)])
    .reduce((acc: Record<string, boolean>, [gitStatus, p]) => {
      const dir = p
        .split('/')
        .slice(0, maxDepth + 1)
        .join('/');
      if (dir in acc) {
        const oldStatus = acc[dir];
        acc[dir] = oldStatus || (!oldStatus && gitStatus !== 'D');
      } else {
        acc[dir] = gitStatus !== 'D';
      }
      return acc;
    }, {});

  const cleanedChanges = Object.keys(
    Object.fromEntries(
      Object.entries(aggregatedChanges).filter(([, status]) => {
        return !(ignoreIfAllDeletions && status === false);
      })
    )
  );

  return cleanedChanges;
}
