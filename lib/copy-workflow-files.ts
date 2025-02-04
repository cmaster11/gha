/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';
import { rootDir, workflowsConfigsDir, workflowsDir } from './constants.js';
import { glob } from 'zx';
import { globCopy } from './glob.js';

import { getWorkflowConfig } from './config.js';

export async function copyWorkflowFiles(workflowName: string) {
  const tmpDir = tmpdir();
  const tmpWorkflowsDir = path.join(tmpDir, '.github', 'workflows');
  await fs.mkdirp(tmpWorkflowsDir);
  console.log(`Cloning workflow ${workflowName} files to ${tmpWorkflowsDir}`);

  {
    // Copy over all relevant workflow files
    const filesToCopy = await glob(
      [
        `${workflowName}.yml`,
        // Any sub-workflows
        `${workflowName}.*.yml`,
        `${workflowName}.README.md`
      ],
      {
        cwd: workflowsDir
      }
    );

    for (const file of filesToCopy) {
      let dest = path.join(tmpWorkflowsDir, file);
      if (file == `${workflowName}.README.md`) {
        dest = path.join(tmpDir, 'README.md');
      }

      console.log(`Copying file ${file} to ${dest}`);
      await fs.copy(path.join(workflowsDir, file), dest);
    }
  }

  // Copy any additionally defined files
  const workflowConfig = await getWorkflowConfig(
    path.join(workflowsConfigsDir, `${workflowName}.config.yml`)
  );

  for (const copyKey in workflowConfig.copy) {
    console.log(
      `Copying config-defined glob pattern ${copyKey} to ${workflowConfig.copy[copyKey]}`
    );
    await globCopy(copyKey, workflowConfig.copy[copyKey], {
      srcCwd: rootDir,
      destCwd: tmpDir
    });
  }

  return tmpDir;
}
