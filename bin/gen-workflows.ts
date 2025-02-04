/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { workflowsDir } from '../lib/constants.js';
import { parse, stringify } from 'yaml';
import * as prettier from 'prettier';
import { actionsRemapping } from '../lib/ci/ci-shared.js';

$.verbose = true;

const workflowsToGen = (await fs.readdir(workflowsDir)).filter((f) =>
  f.startsWith('gen-wf')
);

for (const workflowName of workflowsToGen) {
  // Build the wf-XXX.yml workflow from the gen-wf-XXX.yml one
  const outFileName = workflowName.replace(/^gen-wf-/, 'wf-');
  const workflow = parse(
    await fs.readFile(path.join(workflowsDir, workflowName), 'utf-8')
  );

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
        case 'gen-test-catch-all-workflow': {
          if (step.uses == './tmp-inline/action-ci-build') {
            // Make it so that generated tests will use versioned actions
            step.with.remapped = true;
          }
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

      if (step.uses && step.uses in actionsRemapping) {
        step.uses =
          'cmaster11/gha@' +
          actionsRemapping[step.uses as keyof typeof actionsRemapping];
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

  const outFilePath = path.join(workflowsDir, outFileName);
  await fs.writeFile(outFilePath, content);
}
