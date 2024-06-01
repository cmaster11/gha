import path from 'node:path';
import { actionsDir } from './constants.js';
import { parse, stringify } from 'yaml';
import { string } from 'joi';

export async function copyActionFiles(actionName: string) {
  const tmpDir = tmpdir();
  console.log(`Cloning action ${actionName} files to ${tmpDir}`);

  const actionDir = path.join(actionsDir, actionName);

  // Copy over all relevant action files

  // Fix the action.yml file to strip out any PREBUILD steps
  {
    const actionYmlContents = parse(
      await fs.readFile(path.join(actionDir, 'action.yml'), 'utf-8')
    );

    if ('runs' in actionYmlContents && 'steps' in actionYmlContents.runs) {
      const idx = (actionYmlContents.runs.steps as { id: string }[]).findIndex(
        (step) => step.id == 'PREBUILD'
      );
      if (idx > 0) {
        actionYmlContents.runs.steps.splice(idx, 1);
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
