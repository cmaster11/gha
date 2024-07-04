/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';
import { actionsDir, rootDir } from './constants.js';
import { parse, stringify } from 'yaml';
import { getActionConfig } from './config.js';
import { globCopy } from './glob.js';

export async function fixActionYml(
  actionDir: string,
  mappedBinaries: Record<string, string>
) {
  const actionYmlPath = path.join(actionDir, 'action.yml');
  if (!(await fs.exists(actionYmlPath))) {
    throw new Error(`Could not find ${actionYmlPath} file`);
  }

  const actionYmlContents = parse(await fs.readFile(actionYmlPath, 'utf-8'));

  if ('runs' in actionYmlContents) {
    const runs = actionYmlContents.runs;

    // Fix the action.yml file to strip out any PREBUILD steps
    if ('steps' in runs) {
      const idx = (runs.steps as { id: string }[]).findIndex(
        (step) => step.id == 'PREBUILD'
      );
      if (idx >= 0) {
        console.log('Found PREBUILD step, removing it for build');
        runs.steps.splice(idx, 1);
      }
    } else if ('main' in runs) {
      // Replace the entrypoint if it is a TypeScript file, with the built one
      const bin = runs.main;
      if (bin in mappedBinaries) {
        console.log(
          `Replacing main entrypoint ${bin} with ${mappedBinaries[bin]}`
        );
        runs.main = mappedBinaries[bin];
      }
    }
  }

  await fs.writeFile(actionYmlPath, stringify(actionYmlContents));
}

export async function copyActionFiles(
  actionName: string,
  mappedBinaries: Record<string, string>,
  tmpDir?: string
) {
  tmpDir ??= tmpdir();
  await fs.mkdirp(tmpDir);
  console.log(`Cloning action ${actionName} files to ${tmpDir}`);

  const actionDir = path.join(actionsDir, actionName);

  const actionConfig = await getActionConfig(
    path.join(actionDir, 'config.yml')
  );

  // Copy over all relevant action files
  const filesToCopy = ['action.yml', 'README.md', 'dist'];
  for (const file of filesToCopy) {
    if (await fs.exists(path.join(actionDir, file))) {
      const dest = path.join(tmpDir, file);
      console.log(`Copying default file ${file} to ${dest}`);
      await fs.copy(path.join(actionDir, file), dest);
    }
  }

  for (const copyKey in actionConfig.copy) {
    console.log(
      `Copying config-defined glob pattern ${copyKey} to ${actionConfig.copy[copyKey]}`
    );
    await globCopy(copyKey, actionConfig.copy[copyKey], {
      srcCwd: rootDir,
      destCwd: tmpDir
    });
  }

  await fixActionYml(tmpDir, mappedBinaries);

  return tmpDir;
}
