/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import * as path from 'node:path';
import 'zx/globals';
import { gitDiffLines } from './git.js';

export interface GetChangedFilesOpts {
  baseSHA: string;
  regex?: RegExp;
  ignoreDeletions?: boolean;
}

export async function getChangedFiles({
  baseSHA,
  regex,
  ignoreDeletions
}: GetChangedFilesOpts) {
  regex ??= /.*/;

  const diffLines = (await gitDiffLines(baseSHA)).filter(([, p]) =>
    regex.test(p)
  );

  // Composes an object where the key is the file and the value is `true` if at least 1 file was NOT deleted
  const aggregatedChanges = diffLines.reduce(
    (acc: Record<string, boolean>, [gitStatus, p]) => {
      acc[p] = gitStatus !== 'D';
      return acc;
    },
    {}
  );

  const cleanedChanges = Object.keys(
    Object.fromEntries(
      Object.entries(aggregatedChanges).filter(([, status]) => {
        return !(ignoreDeletions && status === false);
      })
    )
  );

  return cleanedChanges;
}

export interface GetChangedDirectoriesOpts {
  baseSHA: string;
  regex?: RegExp;
  maxDepth?: number;
  ignoreIfAllDeletions?: boolean;
}

export async function getChangedDirectories({
  baseSHA,
  regex,
  maxDepth,
  ignoreIfAllDeletions
}: GetChangedDirectoriesOpts) {
  regex ??= /.*/;
  maxDepth ??= 0;

  const diffLines = (await gitDiffLines(baseSHA)).filter(([, p]) =>
    regex.test(p)
  );

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
