/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */
import 'zx/globals';
import { getBooleanInput, getInput, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { inspect } from '../../lib/inspect.js';
import { ciGetChangesMatrix } from '../../lib/ci/ci-get-changes-matrix.js';
import type { GithubCommonProps } from '../../lib/github-common.js';
import { getOctokitWithOwnerAndRepo } from '../../lib/github-common.js';
import { githubGetPrReleaseLabel } from '../../lib/github-get-pr-labels.js';
import { ciBuild } from '../../lib/ci/ci-build.js';
import type { ReleaseLabel } from '../../lib/version.js';
import { findReleaseLabel } from '../../lib/version.js';
import { ciPostBuildTest } from '../../lib/ci/ci-post-build-test.js';
import { ciCleanup } from '../../lib/ci/ci-cleanup.js';

async function main() {
  const phase = getInput('phase', { required: true });
  const token = getInput('token', { required: true });

  console.log('Running ci-build', {
    phase,
    cwd: process.cwd()
  });

  const pullNumber = context.payload.pull_request?.number;
  if (pullNumber == null) {
    throw new Error(`Missing PR number: ${inspect(context)}`);
  }

  const gh = getOctokitWithOwnerAndRepo(
    context.repo.owner,
    context.repo.repo,
    token
  );

  switch (phase) {
    case 'get-release-label': {
      return ciGetReleaseLabel(gh, pullNumber);
    }
    case 'get-changed-actions': {
      return ciGetChangesMatrix(context.payload.pull_request!.base.sha);
    }
    case 'build': {
      const actionName = getInput('action-name', { required: true });
      const release = getBooleanInput('release');
      const releaseLabel = getReleaseLabel();
      return ciBuild({
        gh,
        pullNumber,
        actionName,
        releaseLabel,
        release
      });
    }
    case 'post-build-test': {
      const actionName = getInput('action-name', { required: true });
      const release = getBooleanInput('release');
      const versionBranch = getInput('version-branch', { required: true });
      const headSHA = getInput('head-sha', { required: true });
      const headRef = getInput('head-ref', { required: true });
      return ciPostBuildTest({
        gh,
        actionName,
        release,
        versionBranch,
        headSHA,
        headRef
      });
    }
    case 'cleanup': {
      return ciCleanup({ gh, pullNumber });
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

async function ciGetReleaseLabel(gh: GithubCommonProps, pullNumber: number) {
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
