/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { tmpfile } from 'zx';
import { fileURLToPath } from 'node:url';

export async function esBuild({
  entryPoint,
  outFile
}: {
  entryPoint: string;
  outFile: string;
}) {
  // Binary in the context of the bare repo
  const esBuildBinaryNodeModules = path.join(
    'node_modules',
    'esbuild',
    'bin',
    'esbuild'
  );
  // Binary in the context of the built action
  const esBuildBinaryAction = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'esbuild'
  );
  const esBuildBinary = (await fs.exists(esBuildBinaryNodeModules))
    ? esBuildBinaryNodeModules
    : esBuildBinaryAction;

  const tmpShim = tmpfile('cjs-shim.js', cjsShim);

  await $`${esBuildBinary} ${entryPoint} ${[
    '--bundle',
    `--outfile=${outFile}`,
    `--platform=node`,
    `--keep-names`,
    `--sourcemap=inline`,
    `--format=esm`,
    `--inject:${tmpShim}`
  ]}`;
}

const cjsShim = `
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';

globalThis.require = createRequire(import.meta.url);
globalThis.__filename = url.fileURLToPath(import.meta.url);
globalThis.__dirname = path.dirname(__filename);
`;
