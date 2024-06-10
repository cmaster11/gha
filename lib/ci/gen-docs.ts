/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { actionsDir, rootDir, workflowsDir } from '../constants.js';
import { parse } from 'yaml';
import * as prettier from 'prettier';

$.verbose = true;

const readmePath = path.join(rootDir, 'README.md');
let readmeContent = await fs.readFile(readmePath, 'utf-8');

// List all actions
const actionLinks: string[] = [];

const allActions = await fs.readdir(actionsDir);
for (const action of allActions) {
  const actionDir = path.join(actionsDir, action);

  let desc: string;

  // If the action comes with a README.md file, then use the first sentence of the README
  // as description, otherwise refer to the action.yml description field
  if (await fs.exists(path.join(actionDir, 'README.md'))) {
    const content = await fs.readFile(
      path.join(actionDir, 'README.md'),
      'utf-8'
    );
    desc = content
      .replace(/^# .+$/m, '')
      .trim()
      .split('\n')[0];
    if (desc == null)
      throw new Error(
        `The action ${action} is missing the first line in the README.md file.`
      );
  } else {
    const actionConfig = parse(
      await fs.readFile(path.join(actionDir, 'action.yml'), 'utf-8')
    );
    desc = actionConfig.description as string;
    if (desc == null)
      throw new Error(`The action ${action} is missing the description field.`);
  }

  actionLinks.push(`- [\`${action}\`](./actions/${action}): ${desc.trim()}`);
}

// List all workflows
const workflowLinks: string[] = [];

const allWorkflows = (await fs.readdir(workflowsDir)).filter((f) =>
  /^workflow-[^.]+\.yml$/.test(f)
);
for (const workflow of allWorkflows) {
  let desc: string;
  const workflowName = workflow.replace(/\.yml$/, '');

  // If the workflow comes with a README.md file, then use the first sentence of the README
  // as description, otherwise refer to the workflow.yml description field
  const readmeFileName = `${workflowName}.README.md`;
  const readmeFile = path.join(workflowsDir, readmeFileName);
  const readmeFileExists = await fs.exists(readmeFile);
  if (readmeFileExists) {
    const content = await fs.readFile(readmeFile, 'utf-8');
    desc = content
      .replace(/^# .+$/m, '')
      .trim()
      .split('\n')[0];
    if (desc == null)
      throw new Error(
        `The workflow ${workflow} is missing the first line in the README.md file.`
      );
  } else {
    const workflowConfig = parse(
      await fs.readFile(path.join(workflowsDir, workflow), 'utf-8')
    );
    desc = workflowConfig.name as string;
    if (desc == null)
      throw new Error(`The workflow ${workflow} is missing the name field.`);
  }
  workflowLinks.push(
    `- [\`${workflowName}\`](./.github/workflows/${readmeFileExists ? readmeFileName : workflow}): ${desc.trim()}`
  );
}

readmeContent =
  readmeContent.split('<!-- GENERATE_ACTIONS BEGIN -->')[0] +
  '<!-- GENERATE_ACTIONS BEGIN -->\n' +
  actionLinks.join('\n') +
  '\n<!-- GENERATE_ACTIONS END -->' +
  readmeContent.split('<!-- GENERATE_ACTIONS END -->')[1];

readmeContent =
  readmeContent.split('<!-- GENERATE_WORKFLOWS BEGIN -->')[0] +
  '<!-- GENERATE_WORKFLOWS BEGIN -->\n' +
  workflowLinks.join('\n') +
  '\n<!-- GENERATE_WORKFLOWS END -->' +
  readmeContent.split('<!-- GENERATE_WORKFLOWS END -->')[1];

readmeContent = await prettier.format(readmeContent, { parser: 'markdown' });

await fs.writeFile(readmePath, readmeContent);
