import { inspect } from 'node:util';
import 'zx/globals';
import { getChangedDirectories } from '../../../lib/get-changed-directories.js';

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

const changes = await getChangedDirectories({
  baseSHA: INPUT_BASE_SHA,
  directoryRegex,
  maxDepth,
  ignoreIfAllDeletions
});

console.log(`Changes: ${inspect(changes)}`);

if (GITHUB_OUTPUT) {
  await fs.appendFile(
    GITHUB_OUTPUT,
    `matrix=${JSON.stringify({
      directory: changes
    })}\n`
  );
  await fs.appendFile(GITHUB_OUTPUT, `matrix-empty=${changes.length === 0}\n`);
}
