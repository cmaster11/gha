/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';
import { workflowsDir } from './constants.js';
import { glob } from 'zx';

export async function copyWorkflowFiles(workflowName: string) {
  const tmpDir = tmpdir();
  const tmpWorkflowsDir = path.join(tmpDir, '.github', 'workflows');
  await fs.mkdirp(tmpWorkflowsDir);
  console.log(`Cloning workflow ${workflowName} files to ${tmpWorkflowsDir}`);

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

  return tmpDir;
}
