/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import path from 'node:path';

export const rootDir = '.';
export const actionsDir = path.join(rootDir, 'actions');
export const workflowsDir = path.join(rootDir, '.github', 'workflows');
export const ghaCIBuildInlineTmpDir = path.join(rootDir, 'tmp-inline');
export const workflowsConfigsDir = path.join(
  rootDir,
  '.github',
  'cmaster11-gha-workflows-configs'
);
