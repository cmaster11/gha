const __dirname = import.meta.dirname;
const rootDir = path.join(__dirname, '..');

const deps = require(path.join(rootDir, 'package.json')).devDependencies;
const actionToBuild = minimist(process.argv.slice(3))._[0];

await $`npm install esbuild@${deps.esbuild}`;
await $`npx tsx ${path.join(__dirname, 'build.mts')} ${actionToBuild}`.quiet();
