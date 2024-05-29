#!/usr/bin/env npx tsx
import { inspect } from 'node:util';
import * as path from 'node:path';
import 'zx/globals';

const {
  INPUT_BASE_SHA,
  INPUT_REGEX,
  INPUT_MAX_DEPTH,
  INPUT_IGNORE_IF_ALL_DELETIONS,
  GITHUB_OUTPUT
} = process.env;

if (INPUT_BASE_SHA == null) throw new Error('Missing INPUT_BASE_SHA env var');

const directoryRegex = INPUT_REGEX ? new RegExp(INPUT_REGEX) : /.*/;
const maxDepth = INPUT_MAX_DEPTH !== undefined ? parseInt(INPUT_MAX_DEPTH) : 0;
if (isNaN(maxDepth)) throw new Error(`Invalid max depth ${maxDepth}`);
const ignoreIfAllDeletions = INPUT_IGNORE_IF_ALL_DELETIONS === 'true';

const lineRegex = /^(\w+)\s+(\S.+)$/;

const diffLines = (await $`git diff --name-status ${INPUT_BASE_SHA}`).stdout
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

console.log(`Changes: ${inspect(cleanedChanges)}`);

if (GITHUB_OUTPUT) {
  await fs.appendFile(
    GITHUB_OUTPUT,
    `matrix=${JSON.stringify({
      directory: cleanedChanges
    })}\n`
  );
  await fs.appendFile(
    GITHUB_OUTPUT,
    `matrix-empty=${cleanedChanges.length === 0}\n`
  );
}
