/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import Joi from 'joi';
import { gitDiffLines } from '../git.js';
import { getChangedFiles } from '../get-changed-directories.js';
import { inspect } from 'node:util';
import { setOutput } from '@actions/core';
import { actionsDir } from '../constants.js';
import path from 'node:path';
import klaw from 'klaw';

$.verbose = true;

interface Opts {
  baseSHA: string;
}

async function main() {
  const { _, ...rest } = minimist(process.argv.slice(2), {
    string: ['baseSHA']
  });

  const opts = Joi.attempt(
    rest,
    Joi.object({
      baseSHA: Joi.string().required()
    }).required(),
    {
      allowUnknown: true
    }
  ) as Opts;

  const changedActions = new Set<string>([
    ...(
      await getChangedFiles({
        baseSHA: opts.baseSHA,
        regex: /^\.github\/workflows\/test-action-.+\.yml$/,
        ignoreDeletions: true
      })
    ).map((d) =>
      d.replace(/^\.github\/workflows\/test-(action-.+)\.yml$/, '$1')
    )
  ]);

  // If any JS-related files change, rebuild all JS actions
  const diffLines = await gitDiffLines(opts.baseSHA);
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

  const changedDirs = Array.from(changedActions).map((a) => `actions/${a}`);

  console.log(`Changes: ${inspect(changedDirs)}`);

  setOutput(
    'matrix',
    JSON.stringify({
      directory: changedDirs
    })
  );
  setOutput('matrix-empty', changedDirs.length === 0);
}

void main();
