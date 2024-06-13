/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { genTestCatchAllWorkflow } from '../gen-test-catch-all-workflow.js';
import type { GithubCommonProps } from '../github-common.js';
import { ciTestCatchAllWorkflowName } from './ci-shared.js';
import { setOutput } from '@actions/core';
import { workflowsDir } from '../constants.js';
import { gitHubCreateOrUpdateComment } from '../github-comments.js';

export async function ciGenTestCatchAllWorkflow({
  gh,
  pullNumber,
  triggeringActor,
  remapped
}: {
  gh: GithubCommonProps;
  triggeringActor: string;
  pullNumber: number;
  remapped: boolean;
}) {
  const changed = await genTestCatchAllWorkflow(remapped);
  setOutput('had-changes', changed);
  if (!changed) {
    return;
  }

  // If there are any changes, commit them and then trigger
  // the new build workflow
  await $`git add ${workflowsDir}/${ciTestCatchAllWorkflowName}`;
  await $`git commit -n -m "[cmaster11/gha] Auto-gen test-catch-all workflow"`;
  await $`git push`;

  const body = [
    '### [cmaster11/gha]',
    [
      `@${triggeringActor} Your test-catch-all workflow has been regenerated.`,
      `Please create another commit to re-trigger the cmaster11/gha build workflow.`
    ].join('\n'),
    `Suggestion: `,
    '```shell\n' +
      `
git pull && git commit --allow-empty -m "Trigger Build" && git push
`.trim() +
      '\n```'
  ].join('\n\n');
  await gitHubCreateOrUpdateComment(
    gh,
    pullNumber,
    `${ciGenTestCatchAllWorkflow.name}-${new Date().getTime()}`,
    body
  );
}
