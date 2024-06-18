/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */
import 'zx/globals';
import { getBooleanInput, getInput, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { ciGetChangesMatrix } from '../../lib/ci/ci-get-changes-matrix.js';
import type { GithubCommonProps } from '../../lib/github-common.js';
import { getOctokitWithOwnerAndRepo } from '../../lib/github-common.js';
import { githubGetPrReleaseLabel } from '../../lib/github-get-pr-labels.js';
import { ciBuildActions } from '../../lib/ci/ci-build-actions.js';
import type { ReleaseLabel } from '../../lib/version.js';
import { findReleaseLabel } from '../../lib/version.js';
import { ciPostBuildTestActions } from '../../lib/ci/ci-post-build-test-actions.js';
import { ciCleanup } from '../../lib/ci/ci-cleanup.js';
import { inspect } from '../../lib/inspect.js';
import { ciBuildWorkflows } from '../../lib/ci/ci-build-workflows.js';
import { ciPostBuildTestWorkflows } from '../../lib/ci/ci-post-build-test-workflows.js';
import type { TestPayload } from '../../lib/ci/ci-shared.js';
import { ciPostTest } from '../../lib/ci/ci-post-test.js';
import { ciGenTestCatchAllWorkflow } from '../../lib/ci/ci-gen-test-catch-all-workflow.js';

async function main() {
  const phase = getInput('phase', { required: true });
  const token = getInput('token', { required: true });
  const workingDirectory = getInput('working-directory');
  if (workingDirectory != '') cd(workingDirectory);

  console.log(
    `Running ci-build: ${inspect({
      phase,
      cwd: process.cwd()
    })}`
  );

  const testPayloadString = getInput('test-ctx');
  const testPayload: TestPayload | undefined = testPayloadString
    ? JSON.parse(testPayloadString)
    : undefined;

  let pullNumber = context.payload.pull_request?.number;
  if (pullNumber == null) {
    console.log(`Null pull_number from context, using inputs one.`);
    const input = parseInt(getInput('pull-number'));
    if (!isNaN(input)) {
      pullNumber = input;
    } else if (testPayload) {
      pullNumber = testPayload.pullNumber;
    }
  }
  if (pullNumber == null) {
    throw new Error(`Could not fund PR number`);
  }

  const gh = getOctokitWithOwnerAndRepo(
    context.repo.owner,
    context.repo.repo,
    token
  );

  switch (phase) {
    case 'gen-test-catch-all-workflow': {
      const headRef = getInput('head-ref', { required: true });
      const remapped = getBooleanInput('remapped', { required: true });
      return ciGenTestCatchAllWorkflow({
        headRef,
        remapped
      });
    }
    case 'get-release-label': {
      return ciGetReleaseLabel({ gh, pullNumber });
    }
    case 'get-changed-elements': {
      return ciGetChangesMatrix({
        gh,
        pullNumber,
        baseSHA: context.payload.pull_request!.base.sha
      });
    }
    case 'build-actions': {
      const actionName = getInput('action-name', { required: true });
      const release = getBooleanInput('release');
      const releaseLabel = getReleaseLabel();
      return ciBuildActions({
        gh,
        pullNumber,
        actionName,
        releaseLabel,
        release
      });
    }
    case 'build-workflows': {
      const workflowName = getInput('workflow-name', { required: true });
      const release = getBooleanInput('release');
      const releaseLabel = getReleaseLabel();
      return ciBuildWorkflows({
        gh,
        pullNumber,
        workflowName,
        releaseLabel,
        release
      });
    }
    case 'post-build-test-actions': {
      const actionName = getInput('action-name', { required: true });
      const release = getBooleanInput('release');
      const versionBranch = getInput('version-branch', { required: true });
      const headSHA = getInput('head-sha', { required: true });
      const headRef = getInput('head-ref', { required: true });
      return ciPostBuildTestActions({
        gh,
        actionName,
        pullNumber,
        release,
        versionBranch,
        headSHA,
        headRef
      });
    }
    case 'post-build-test-workflows': {
      const workflowName = getInput('workflow-name', { required: true });
      const release = getBooleanInput('release');
      const versionBranch = getInput('version-branch', { required: true });
      const headSHA = getInput('head-sha', { required: true });
      const headRef = getInput('head-ref', { required: true });
      return ciPostBuildTestWorkflows({
        gh,
        workflowName,
        pullNumber,
        release,
        versionBranch,
        headSHA,
        headRef
      });
    }
    case 'post-test': {
      const needs = JSON.parse(getInput('needs-json', { required: true }));
      if (testPayload == null) throw new Error('Missing test-ctx input');
      return ciPostTest({
        gh,
        payload: testPayload,
        needs,
        runId: context.runId
      });
    }
    case 'cleanup': {
      return ciCleanup({ gh, pullNumber });
    }
    case 'test-action-ci-build': {
      return ciBuildActions({
        actionName: 'test-action',
        inline: true
      });
    }
    default:
      throw new Error(`Invalid CI build phase: ${phase}`);
  }
}

function getReleaseLabel(): ReleaseLabel {
  const releaseLabelString = getInput('release-label', { required: true });
  const releaseLabel = findReleaseLabel([releaseLabelString]);
  if (releaseLabel == null || releaseLabel == false)
    throw new Error(`Missing release label, got ${releaseLabelString}`);
  return releaseLabel;
}

async function ciGetReleaseLabel({
  gh,
  pullNumber
}: {
  gh: GithubCommonProps;
  pullNumber: number;
}) {
  const label = await githubGetPrReleaseLabel({
    gh,
    pullNumber
  });
  if (label) {
    setOutput('release-label', label);
    setOutput('continue-release', true);
  } else {
    setOutput('release-label', null);
    setOutput('continue-release', false);
  }
}

void main();
