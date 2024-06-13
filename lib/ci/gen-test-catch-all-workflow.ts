/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { workflowsDir } from '../constants.js';
import { stringify } from 'yaml';
import * as prettier from 'prettier';
import { ciTestCatchAllWorkflowName } from './ci-shared.js';

$.verbose = true;

// Build the wf-build.yml workflow from the ci-build.yml one
const allTestWorkflows = (await fs.readdir(workflowsDir)).filter((w) =>
  /^test-(action|workflow|wf)-[^.]+.yml$/.test(w)
);

const jobs: Record<string, {}> = Object.fromEntries(
  allTestWorkflows.map((w) => {
    const workflowName = w.replace(/\.yml/, '');
    return [
      workflowName,
      {
        if: `inputs.workflow-name == '${workflowName}'`,
        uses: `./.github/workflows/${w}`,
        with: { 'test-ctx': '${{ inputs.test-ctx }}' }
      }
    ];
  })
);

jobs['ci-post-test'] = {
  needs: Object.keys(jobs),
  'runs-on': 'ubuntu-latest',
  permissions: {
    statuses: 'write'
  },
  steps: [
    {
      uses: `./actions/action-ci-build`,
      with: {
        phase: 'post-test',
        token: '${{ secrets.GITHUB_TOKEN }}',
        'needs-json': '${{ toJSON(needs) }}',
        'test-ctx': '${{ inputs.test-ctx }}'
      }
    }
  ]
};

const workflow = {
  name: 'Run test workflows',
  on: {
    workflow_dispatch: {
      inputs: {
        'workflow-name': {
          description: 'The name of the test workflow to run',
          required: true,
          type: 'string'
        },
        'test-ctx': {
          description: 'The context for the test workflow',
          required: true,
          type: 'string'
        }
      }
    }
  },
  jobs
};

let content = stringify(workflow, { lineWidth: 0 });
content = await prettier.format(content, { parser: 'yaml' });

const outFilePath = path.join(workflowsDir, ciTestCatchAllWorkflowName);
await fs.writeFile(outFilePath, content);
await $`actionlint ${outFilePath}`;
