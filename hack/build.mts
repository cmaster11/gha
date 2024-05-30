#!/usr/bin/env npx tsx
import 'zx/globals';
import * as esbuild from 'esbuild';
import { minimist } from 'zx';

const __dirname = import.meta.dirname;

const rootDir = path.join(__dirname, '..');

let actionToBuild = minimist(process.argv.slice(2))._[0];
if (path.isAbsolute(actionToBuild)) {
  actionToBuild = path.relative(rootDir, actionToBuild);
} else {
  actionToBuild = 'actions/' + actionToBuild;
}

const actionToBuildDirFullPath = path.join(rootDir, actionToBuild);
const distDir = path.join(actionToBuildDirFullPath, 'dist');
await fs.mkdirp(distDir);

const binsToBuild = await fs.readdir(
  path.join(actionToBuildDirFullPath, 'bin')
);
for (const bin of binsToBuild) {
  console.log(`Building ${bin}`);
  const fullPath = path.join(actionToBuildDirFullPath, 'bin', bin);
  const outFile = path.join(distDir, bin.replace(/\.mts/, '') + '.mjs');
  await esbuild.build({
    entryPoints: [fullPath],
    bundle: true,
    keepNames: true,
    sourcemap: false,
    outfile: outFile,
    platform: 'node',
    format: 'esm'
  });

  const unpatchedBuild = await fs.readFile(outFile, 'utf-8');
  const patchedBuild = unpatchedBuild.replace(
    "'use strict';",
    "#!/usr/bin/env node\n\n'use strict;'\n"
  );
  await fs.writeFile(outFile, patchedBuild, 'utf-8');
}
