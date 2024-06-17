/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { genTestCatchAllWorkflow } from '../gen-test-catch-all-workflow.js';
import { ciTestCatchAllWorkflowName } from './ci-shared.js';
import { setOutput } from '@actions/core';
import { workflowsDir } from '../constants.js';

export async function ciGenTestCatchAllWorkflow({
  headRef,
  remapped
}: {
  headRef: string;
  remapped: boolean;
}) {
  const changed = await genTestCatchAllWorkflow(remapped);
  setOutput('had-changes', changed);
  if (!changed) {
    return;
  }

  const branch = headRef.replace(/^refs\/heads\//, '');

  // If there are any changes, commit them and then trigger
  // the new build workflow
  await $`git add ${workflowsDir}/${ciTestCatchAllWorkflowName}`;
  await $`git commit -n -m "[cmaster11/gha] Auto-gen test-catch-all workflow"`;
  await $`git push origin HEAD:${branch}`;
}
