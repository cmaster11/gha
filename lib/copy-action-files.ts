/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';
import { actionsDir } from './constants.js';
import { parse, stringify } from 'yaml';

export async function copyActionFiles(
  actionName: string,
  mappedBinaries: Record<string, string>
) {
  const tmpDir = tmpdir();
  console.log(`Cloning action ${actionName} files to ${tmpDir}`);

  const actionDir = path.join(actionsDir, actionName);

  // Copy over all relevant action files
  {
    const actionYmlContents = parse(
      await fs.readFile(path.join(actionDir, 'action.yml'), 'utf-8')
    );

    if ('runs' in actionYmlContents) {
      // Fix the action.yml file to strip out any PREBUILD steps
      if ('steps' in actionYmlContents.runs) {
        const idx = (
          actionYmlContents.runs.steps as { id: string }[]
        ).findIndex((step) => step.id == 'PREBUILD');
        if (idx >= 0) {
          console.log('Found PREBUILD step, removing it for build');
          actionYmlContents.runs.steps.splice(idx, 1);
        }
      } else if ('main' in actionYmlContents) {
        // Replace the entrypoint if it is a TypeScript file, with the built one
        const bin = actionYmlContents.main;
        if (bin in mappedBinaries) {
          actionYmlContents.main = mappedBinaries[bin];
        }
      }
    }

    await fs.writeFile(
      path.join(tmpDir, 'action.yml'),
      stringify(actionYmlContents)
    );
  }

  if (await fs.exists(path.join(actionDir, 'dist')))
    await fs.copy(path.join(actionDir, 'dist'), path.join(tmpDir, 'dist'));

  if (await fs.exists(path.join(actionDir, 'README.md')))
    await fs.copy(
      path.join(actionDir, 'README.md'),
      path.join(tmpDir, 'README.md')
    );

  return tmpDir;
}
