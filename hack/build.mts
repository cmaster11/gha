#!/usr/bin/env npx tsx
import 'zx/globals';
import Joi from 'joi';
import { parse } from 'yaml';
import * as esbuild from 'esbuild';
const __dirname = import.meta.dirname;

const rootDir = path.join(__dirname, '..');
const actionDirs = (await fs.readdir(rootDir)).filter((dir) =>
  dir.startsWith('action-')
);

const configSchema = Joi.object({
  bin: Joi.array().items(Joi.string())
});

interface Config {
  bin?: string[];
}

async function loadConfig(dir: string): Promise<Config> {
  const contents = await fs.readFile(path.join(dir, 'config.yml'), 'utf-8');
  const configObj = parse(contents);
  return Joi.attempt(configObj, configSchema);
}

// Build all binaries
const binsToBuild = new Set<string>();
for (const actionDir of actionDirs) {
  const config = await loadConfig(path.join(rootDir, actionDir));
  for (const binElement of config.bin ?? []) {
    binsToBuild.add(binElement);
  }
}

const distDir = path.join(rootDir, 'dist');
await fs.mkdirp(distDir);

for (const bin of binsToBuild) {
  const fullPath = path.join(rootDir, 'bin', bin + '.mts');
  const outFile = path.join(distDir, bin + '.mjs');
  await esbuild.build({
    entryPoints: [fullPath],
    bundle: true,
    keepNames: true,
    sourcemap: false,
    outfile: outFile,
    platform: 'node',
    format: 'esm'
  });
}
