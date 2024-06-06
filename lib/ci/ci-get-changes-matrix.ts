/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { gitDiffLines } from '../git.js';
import {
  getChangedDirectories,
  getChangedFiles
} from '../get-changed-directories.js';
import { inspect } from 'node:util';
import { setOutput } from '@actions/core';
import { actionsDir } from '../constants.js';
import path from 'node:path';
import klaw from 'klaw';

export async function ciGetChangesMatrix(baseSHA: string) {
  const changedActions = new Set<string>([
    ...(
      await getChangedDirectories({
        baseSHA,
        regex: /^actions\//,
        ignoreIfAllDeletions: true,
        maxDepth: 1
      })
    ).map((d) => d.replace(/^actions\//, '')),
    ...(
      await getChangedFiles({
        baseSHA,
        regex: /^\.github\/workflows\/test-action-.+\.yml$/,
        ignoreDeletions: true
      })
    ).map((d) =>
      d.replace(/^\.github\/workflows\/test-(action-.+)\.yml$/, '$1')
    )
  ]);

  // If any JS-related files change, rebuild all JS actions
  const diffLines = await gitDiffLines(baseSHA);
  if (
    diffLines.find(([, p]) =>
      [
        'package.json',
        'package-lock.json',
        /^lib\//,
        'jest.config.mjs',
        'tsconfig.json'
      ].some((m) => (m instanceof RegExp ? m.test(p) : m == p))
    ) != null
  ) {
    const allActions = await fs.readdir(actionsDir);
    for (const actionName of allActions) {
      const actionDir = path.join(actionsDir, actionName);
      for await (const file of klaw(actionDir, {
        filter: (f) => /\.m?[tj]s/.test(f)
      })) {
        console.log(`Found changed JS file ${file.path}`);
        changedActions.add(actionName);
        break;
      }
    }
  }

  const changedDirs = Array.from(changedActions);

  console.log(`Changes: ${inspect(changedDirs)}`);

  setOutput(
    'matrix',
    JSON.stringify({
      directory: changedDirs
    })
  );
  setOutput('matrix-empty', changedDirs.length === 0);
}
