/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import * as esbuild from 'esbuild';
import path from 'node:path';
import { actionsDir } from './constants.js';
import { inspect } from './inspect.js';
import { tmpfile } from 'zx';

// Builds the various binaries for the action and returns a map
// containing the mapped paths of the compiled files (src -> dest)
export async function buildBinaries(
  actionName: string
): Promise<Record<string, string>> {
  const actionDir = path.join(actionsDir, actionName);
  const binDir = path.join(actionDir, 'bin');

  const binsToBuild: string[] = [];

  if (await fs.exists(binDir)) {
    binsToBuild.push(
      ...(await fs.readdir(binDir))
        .filter((p) => /\.ts$/.test(p))
        .map((p) => `bin/${p}`)
    );
  }

  if (await fs.exists(path.join(actionDir, 'index.ts'))) {
    binsToBuild.push('index.ts');
  }

  if (binsToBuild.length == 0) {
    console.log('No binaries to build found, exiting');
    return {};
  }

  const distDir = path.join(actionDir, 'dist');
  await fs.mkdirp(distDir);

  const tmpShim = tmpfile('cjs-shim.js', cjsShim);

  const mappedBinaries: Record<string, string> = {};
  for (const bin of binsToBuild) {
    const fullPath = path.join(actionDir, bin);

    const renamedFile = bin.replace(/\.ts$/, '.mjs');
    const outFile = path.join(distDir, renamedFile);
    console.log(`Building ${bin} to ${outFile}`);
    const outFileDir = path.dirname(outFile);
    await fs.mkdirp(outFileDir);
    await esbuild.build({
      entryPoints: [fullPath],
      bundle: true,
      keepNames: true,
      sourcemap: 'inline',
      outfile: outFile,
      platform: 'node',
      format: 'esm',
      inject: [tmpShim]
    });

    const unpatchedBuild = await fs.readFile(outFile, 'utf-8');
    const patchedBuild = '#!/usr/ci/env node\n' + unpatchedBuild;
    await fs.writeFile(outFile, patchedBuild);
    await fs.chmod(outFile, 0o755);

    mappedBinaries[bin] = path.relative(actionDir, outFile);
  }

  console.log(`Built binaries: ${inspect(mappedBinaries)}`);
  return mappedBinaries;
}

const cjsShim = `
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';

globalThis.require = createRequire(import.meta.url);
globalThis.__filename = url.fileURLToPath(import.meta.url);
globalThis.__dirname = path.dirname(__filename);
`;
