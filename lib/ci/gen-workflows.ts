/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { workflowsDir } from '../constants.js';
import { parse, stringify } from 'yaml';
import * as prettier from 'prettier';

$.verbose = true;

// Build the build.yml workflow from the ci-build.yml one
const workflow = parse(
  await fs.readFile(path.join(workflowsDir, 'ci-build.yml'), 'utf-8')
);

const actionsMap: Record<string, string> = {
  './actions/action-git-init-userinfo': 'action-git-init-userinfo/v0',
  './actions/action-ci-build': 'action-ci-build/v0'
};

for (const jobKey in workflow.jobs) {
  const job = workflow.jobs[jobKey];

  console.log(`Job: ${jobKey}, ${job.steps.length} steps`);

  for (let i = job.steps.length - 1; i >= 0; i--) {
    const step = job.steps[i];

    switch (jobKey) {
      case 'get-release-label':
      case 'post-build-test-actions':
      case 'post-build-test-workflows':
        if (step.uses && step.uses.startsWith('actions/checkout@')) {
          job.steps.splice(i, 1);
        }
    }

    switch (jobKey) {
      case 'test':
        // Keep all node stuff
        break;
      default: {
        // Delete all useless node steps
        let del = false;

        if (step.uses && /actions\/setup-node/.test(step.uses)) {
          console.log(`Deleting "uses" step: ${step.uses}`);
          del = true;
        }

        if (step.run && /npm ci|--inline/.test(step.run.trim())) {
          console.log(`Deleting "run" step: ${step.run}`);
          del = true;
        }

        if (del) {
          job.steps.splice(i, 1);
        }
      }
    }

    if (step.uses && step.uses in actionsMap) {
      step.uses = 'cmaster11/gha@' + actionsMap[step.uses];
    }
  }

  // Validate
  for (let i = job.steps.length - 1; i >= 0; i--) {
    const step = job.steps[i];
    if (step.uses && step.uses.startsWith('./actions/')) {
      throw new Error(`Found unprocessed local action: ${step.uses}`);
    }
  }
}

let content = stringify(workflow, { lineWidth: 0 });
content = await prettier.format(content, { parser: 'yaml' });

const outFileName = 'build.yml';
const outFilePath = path.join(workflowsDir, outFileName);
await fs.writeFile(outFilePath, content);
await $`actionlint ${outFilePath}`;
