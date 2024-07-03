/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { glob } from 'zx';
import path from 'node:path';
import type { GlobCopyConfig } from './config.js';
import { escapeRegExp } from './regex.js';

export function globStringToGlob(str: string): string[] {
  return str
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p != '' && !p.startsWith('#'));
}

export async function globCopy(
  patterns: string | string[],
  destConfig: GlobCopyConfig,
  opts: {
    cwd: string;
  }
) {
  const files = await glob(patterns, { cwd: opts.cwd });
  for (let file of files) {
    if (typeof destConfig != 'string') {
      if (destConfig.strip)
        file = file.replace(
          new RegExp('^' + escapeRegExp(destConfig.strip)),
          ''
        );
      if (file.startsWith('/')) file = file.substring(1);
    }
    const srcPath = path.join(opts.cwd, file);
    const destPath = path.join(
      typeof destConfig == 'string' ? destConfig : destConfig.dest,
      file
    );
    const dstDir = path.dirname(destPath);
    await fs.mkdirp(dstDir);
    console.log(`Copying file ${srcPath} to ${destPath}`);
    await fs.copy(srcPath, destPath);
  }
}
