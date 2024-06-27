/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { genTestCatchAllWorkflow } from '../gen-test-catch-all-workflow.js';
import { ciTestCatchAllWorkflowName, gitHubCommentTitle } from './ci-shared.js';
import { setOutput } from '@actions/core';
import { workflowsDir } from '../constants.js';
import { type GithubCommonProps } from '../github-common.js';
import { context } from '@actions/github';
import { gitHubCreateOrUpdateComment } from '../github-comments.js';

export async function ciGenTestCatchAllWorkflow({
  gh,
  pullNumber,
  headRef,
  remapped
}: {
  gh: GithubCommonProps;
  pullNumber: number;
  headRef: string;
  remapped: boolean;
}) {
  const changed = await genTestCatchAllWorkflow(remapped);
  setOutput('had-changes', changed);
  if (!changed) {
    console.log('No changes detected');
    return;
  }

  console.log('Some changes detected!');

  const branch = headRef.replace(/^refs\/heads\//, '');

  // If there are any changes, commit them and then trigger
  // the new build workflow
  await $`git add ${workflowsDir}/${ciTestCatchAllWorkflowName}`;
  await $`git commit -n -m "[cmaster11/gha] Auto-gen test-catch-all workflow"`;
  await $`git push origin HEAD:${branch}`;

  try {
    const actor = process.env.GITHUB_TRIGGERING_ACTOR ?? context.actor;
    // We don't want to tag a bot
    const actorTag = actor.includes('[bot]')
      ? `(Triggered by ${actor})`
      : `@${actor}`;

    const body = [
      gitHubCommentTitle,
      `The test catch-all workflow has been regenerated and committed. Please pull the latest changes with \`git pull origin ${branch}\`.`,
      `${actorTag}`
    ].join('\n\n');
    await gitHubCreateOrUpdateComment(
      gh,
      pullNumber,
      `ci-gen-test-catch-all-workflow-${new Date().getTime()}`,
      body
    );
  } catch (err) {
    console.error('Failed to publish comment', err);
  }
}
