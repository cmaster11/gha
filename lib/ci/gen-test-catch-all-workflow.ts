/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import path from 'node:path';
import { workflowsDir } from '../constants.js';
import { parse, stringify } from 'yaml';
import * as prettier from 'prettier';
import { actionsRemapping, ciTestCatchAllWorkflowName } from './ci-shared.js';
import traverse from 'traverse';
import { util } from 'prettier';
import hasSpaces = util.hasSpaces;
import { minimist } from 'zx';

$.verbose = true;

const { remapped } = minimist(process.argv.slice(2), {
  boolean: ['remapped']
});

// Build the wf-build.yml workflow from the ci-build.yml one
const allTestWorkflows = (await fs.readdir(workflowsDir)).filter((w) =>
  /^test-(action|workflow|wf)-[^.]+.yml$/.test(w)
);

const jobs: Record<string, {}> = {};

for (const workflowFile of allTestWorkflows) {
  const workflowName = workflowFile.replace(/\.yml/, '');

  // Find all the required permissions of the test workflow
  const permissions: Record<string, 'read' | 'write'> = {};
  const content = parse(
    await fs.readFile(path.join(workflowsDir, workflowFile), 'utf-8')
  );
  traverse(content).forEach(function (node) {
    if (this.key !== 'permissions') return;
    for (const key in node) {
      if (
        permissions[key] == null ||
        // Make sure we overwrite read perms with write ones if needed
        permissions[key] == 'read'
      ) {
        permissions[key] = node[key];
      }
    }
    this.block();
  });
  let hasPermissions = Object.keys(permissions).length > 0;
  if (hasPermissions) {
    // Make sure we always have at least the default read permissions for all jobs
    // https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token

    const keys = ['contents', 'packages'];
    for (const key of keys) {
      permissions[key] ??= 'read';
    }
    // If all permissions are read permissions, then we don't need any permissions object
    if (Object.values(permissions).every((p) => p == 'read')) {
      hasPermissions = false;
    }
  }

  jobs[workflowName] = {
    if: `github.event_name == 'workflow_dispatch' && inputs.workflow-name == '${workflowFile}'`,
    uses: `./.github/workflows/${workflowFile}`,
    secrets: 'inherit',
    ...(hasPermissions ? { permissions } : {}),
    with: { 'test-ctx': '${{ inputs.test-ctx }}' }
  };
}

jobs['ci-post-test'] = {
  if: `always() && github.event_name == 'workflow_dispatch'`,
  needs: Object.keys(jobs),
  'runs-on': 'ubuntu-latest',
  permissions: remapped
    ? {
        statuses: 'write'
      }
    : {
        statuses: 'write',
        contents: 'read'
      },
  steps: [
    ...(remapped
      ? []
      : [
          {
            uses: 'actions/checkout@v4'
          },
          {
            uses: 'actions/setup-node@v4',
            with: {
              'node-version-file': 'package.json',
              cache: 'npm'
            }
          },
          {
            shell: 'bash',
            run: 'npm ci'
          },
          {
            run: 'npx tsx ./lib/ci/ci-build-actions.ts --inline action-ci-build'
          }
        ]),
    {
      uses: remapped
        ? actionsRemapping['./actions/action-ci-build']
        : `./actions/action-ci-build`,
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
    },
    pull_request: {
      branches: ['main'],
      paths: [`.github/workflows/${ciTestCatchAllWorkflowName}`]
    }
  },
  jobs
};

let content = stringify(workflow, { lineWidth: 0 });
content = await prettier.format(content, { parser: 'yaml' });

const outFilePath = path.join(workflowsDir, ciTestCatchAllWorkflowName);
await fs.writeFile(outFilePath, content);
