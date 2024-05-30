import 'zx/globals';
import { buildBinaries } from '../lib/build-binaries.mjs';

const __dirname = import.meta.dirname;
const rootDir = path.join(__dirname, '..');

const args = minimist(process.argv.slice(2), {
  // TODO tmp folder, copy action and binaries, strip PREBUILD step
  // TODO If PR, dev branch, otherwise push to version branch?
});
let actionToBuild = args._[0];

if (path.isAbsolute(actionToBuild)) {
  actionToBuild = path.relative(rootDir, actionToBuild);
} else if (!actionToBuild.startsWith('actions/')) {
  actionToBuild = 'actions/' + actionToBuild;
}

const actionToBuildDirFullPath = path.join(rootDir, actionToBuild);

await buildBinaries(actionToBuildDirFullPath);
