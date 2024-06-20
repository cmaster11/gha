/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { actionsDir, rootDir, workflowsDir } from '../constants.js';
import { parse } from 'yaml';
import * as prettier from 'prettier';
import { getGitHubWorkflows } from '../github-workflows.js';
import { actionsRemapping, workflowsRemapping } from './ci-shared.js';

$.verbose = true;

// Reads the file and strips the copyright notice
async function importContent(fileName: string): Promise<string> {
  let content = await fs.readFile(fileName, 'utf-8');

  content = content.replaceAll(/^\/*.*Copyright.* \*\/$/gms, '');

  return content;
}

const paths = [
  path.join(rootDir, 'README.md'),
  path.join(workflowsDir, 'wf-build.README.md')
];

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
      .replaceAll(/\r/g, '')
      .trim()
      .split('\n\n')[0];
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

const allWorkflows = await getGitHubWorkflows(true);
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
      .replaceAll(/\r/g, '')
      .trim()
      .split('\n\n')[0];
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

for (const filePath of paths) {
  let content = await fs.readFile(filePath, 'utf-8');

  if (content.includes('<!-- GENERATE_ACTIONS BEGIN -->'))
    content =
      content.split('<!-- GENERATE_ACTIONS BEGIN -->')[0] +
      '<!-- GENERATE_ACTIONS BEGIN -->\n' +
      actionLinks.join('\n') +
      '\n<!-- GENERATE_ACTIONS END -->' +
      content.split('<!-- GENERATE_ACTIONS END -->')[1];

  if (content.includes('<!-- GENERATE_WORKFLOWS BEGIN -->'))
    content =
      content.split('<!-- GENERATE_WORKFLOWS BEGIN -->')[0] +
      '<!-- GENERATE_WORKFLOWS BEGIN -->\n' +
      workflowLinks.join('\n') +
      '\n<!-- GENERATE_WORKFLOWS END -->' +
      content.split('<!-- GENERATE_WORKFLOWS END -->')[1];

  const re = /<!-- import:([^ ]+) BEGIN -->.*<!-- import:\1 END -->/gs;
  let match: RegExpMatchArray | null;
  while ((match = re.exec(content)) != null) {
    const p = match[1];
    console.log(`[${filePath}] Found import ${p}`);
    let mdExt = path.extname(p).replace(/^\./, '');
    switch (mdExt) {
      case 'yml':
        mdExt = 'yaml';
        break;
    }

    let contents = await importContent(path.join(path.dirname(filePath), p));

    if (p.replace(/(\.\/)?/, '').startsWith('ci-')) {
      for (const key in actionsRemapping) {
        contents = contents.replace(
          key,
          actionsRemapping[key as keyof typeof actionsRemapping]
        );
      }
      for (const key in workflowsRemapping) {
        contents = contents.replace(
          key,
          workflowsRemapping[key as keyof typeof workflowsRemapping]
        );
      }
    }

    const keyBegin = `<!-- import:${p} BEGIN -->`;
    const keyEnd = `<!-- import:${p} END -->`;
    content =
      content.split(keyBegin)[0] +
      keyBegin +
      '\n```' +
      mdExt +
      '\n' +
      contents +
      '\n```\n' +
      keyEnd +
      content.split(keyEnd)[1];
  }

  content = await prettier.format(content, { parser: 'markdown' });

  await fs.writeFile(filePath, content);
}
