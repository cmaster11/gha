import * as esbuild from 'esbuild';

export async function buildBinaries(actionDir: string) {
  const binDir = path.join(actionDir, 'bin');
  if (!(await fs.exists(binDir))) return;

  const distDir = path.join(actionDir, 'dist');
  await fs.mkdirp(distDir);

  const binsToBuild = await fs.readdir(binDir);
  for (const bin of binsToBuild) {
    console.log(`Building ${bin}`);
    const fullPath = path.join(actionDir, 'bin', bin);
    const outFile = path.join(distDir, bin.replace(/\.mts/, '') + '.mjs');
    await esbuild.build({
      entryPoints: [fullPath],
      bundle: true,
      keepNames: true,
      sourcemap: false,
      outfile: outFile,
      platform: 'node',
      format: 'esm',
      inject: [path.join(__dirname, 'cjs-shim.ts')]
    });

    const unpatchedBuild = await fs.readFile(outFile, 'utf-8');
    const patchedBuild = '#!/usr/bin/env node\n' + unpatchedBuild;
    await fs.writeFile(outFile, patchedBuild);
    await fs.chmod(outFile, 0o755);
  }
}
