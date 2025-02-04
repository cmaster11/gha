/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { getGitRemoteBranchesByGlob, gitDiffLines } from '../git.js';
import {
  getChangedDirectories,
  getChangedFiles
} from '../get-changed-directories.js';
import { inspect } from 'node:util';
import { setOutput } from '@actions/core';
import { actionsDir, workflowsConfigsDir, workflowsDir } from '../constants.js';
import path from 'node:path';
import klaw from 'klaw';
import type { GithubCommonProps } from '../github-common.js';
import { gitHubCreateOrUpdateComment } from '../github-comments.js';
import { getGitHubWorkflowsUsingAction } from '../github-workflows.js';
import { getPRSuffix } from '../version.js';
import micromatch from 'micromatch';
import { gitHubCommentTitle } from './ci-shared.js';
import { getActionConfig, getWorkflowConfig } from '../config.js';
import { escapeRegExp } from '../regex.js';

export async function ciGetChangesMatrix({
  gh,
  pullNumber,
  baseSHA,
  changesPathsJs
}: {
  gh: GithubCommonProps;
  pullNumber: number;
  baseSHA: string;
  changesPathsJs: string[];
}) {
  // Fetch all remote branches
  await $`git fetch origin`;

  // Logging/debugging purposes
  await gitDiffLines(baseSHA, true);

  /*
  Find out all changes actions and then any workflows
   */
  const changedActions = await getChangedActions({
    baseSHA,
    changesPathsJs
  });

  // Find all the latest version branches for each changed action
  const changedActionsWithLatestVersion: Record<string, number | undefined> =
    {};
  for (const changedAction of changedActions) {
    const branches = await getGitRemoteBranchesByGlob(changedAction + '/v*');
    const latestVersion = branches.reduce((n: number, el) => {
      const match = /\/v(\d+)$/.exec(el);
      if (match == null) {
        return n;
      }
      const num = parseInt(match[1]);
      if (num > n) {
        return num;
      }
      return n;
    }, -1);
    changedActionsWithLatestVersion[changedAction] =
      latestVersion >= 0 ? latestVersion : undefined;
  }

  const changedWorkflows = await getChangedWorkflows({
    gh,
    pullNumber,
    baseSHA,
    changedActionsWithLatestVersion
  });

  console.log(
    `Changes: actions=${inspect(changedActions)}, workflows=${inspect(changedWorkflows)}`
  );

  {
    const body = [
      gitHubCommentTitle,
      '#### Changed actions',
      ...(changedActions.length == 0
        ? ['No changed actions detected']
        : [changedActions.map((a) => `- \`${a}\``).join('\n')]),
      '#### Changed workflows',
      ...(changedWorkflows.length == 0
        ? ['No changed workflows detected']
        : [changedWorkflows.map((a) => `- \`${a}\``).join('\n')])
    ].join('\n\n');
    await gitHubCreateOrUpdateComment(
      gh,
      pullNumber,
      'ci-get-changes-matrix',
      body
    );
  }

  setOutput(
    'matrix-actions',
    JSON.stringify({
      directory: changedActions
    })
  );
  setOutput('matrix-actions-empty', changedActions.length === 0);

  setOutput(
    'matrix-workflows',
    JSON.stringify({
      directory: changedWorkflows
    })
  );
  setOutput('matrix-workflows-empty', changedWorkflows.length === 0);
}

async function getChangedActions({
  baseSHA,
  changesPathsJs
}: {
  baseSHA: string;
  changesPathsJs: string[];
}): Promise<string[]> {
  const allActions = await fs.readdir(actionsDir);
  const diffLines = await gitDiffLines(baseSHA);

  const changedActions = new Set<string>([
    ...(
      await getChangedDirectories({
        baseSHA,
        regex: /^actions\//,
        ignoreIfAllDeletions: true,
        maxDepth: 1
      })
    )
      .map((d) => d.replace(/^actions\//, ''))
      .map((d) => {
        console.log(
          `Found changed action ${d} because of changed action directory`
        );
        return d;
      }),
    ...(
      await getChangedFiles({
        baseSHA,
        regex: /^\.github\/workflows\/test-action-.+\.yml$/,
        ignoreDeletions: true
      })
    )
      .map((d) =>
        d.replace(/^\.github\/workflows\/test-(action-.+)\.yml$/, '$1')
      )
      .map((d) => {
        console.log(
          `Found changed action ${d} because of changed action test workflow`
        );
        return d;
      })
  ]);

  // If any JS-related files change, rebuild all JS actions
  if (changesPathsJs.length > 0) {
    const jsMatches = micromatch(
      diffLines.map(([, p]) => p),
      changesPathsJs
    );

    if (jsMatches.length > 0) {
      console.log(
        `Found global JS changes: ${inspect(jsMatches, { depth: null })}`
      );

      for (const actionName of allActions) {
        const actionDir = path.join(actionsDir, actionName);
        for await (const file of klaw(actionDir, {
          filter: (f) => /\.m?[tj]s$/.test(f)
        })) {
          if (file.stats.isDirectory()) {
            continue;
          }
          console.log(
            `Found changed JS file ${file.path} because of global JS changes`
          );
          changedActions.add(actionName);
          break;
        }
      }
    }
  }

  // Find actions that have a custom "change files pattern"
  {
    for (const actionName of allActions) {
      const actionDir = path.join(actionsDir, actionName);
      const actionConfig = await getActionConfig(
        path.join(actionDir, 'config.yml')
      );
      if (actionConfig.changesPaths) {
        const matches = micromatch(
          diffLines.map(([, p]) => p),
          actionConfig.changesPaths
        );
        if (matches.length > 0) {
          console.log(
            `Found changed action ${actionName} because of action-configured changesPaths`
          );
          changedActions.add(actionName);
        }
      }
    }
  }

  return Array.from(changedActions);
}

async function getChangedWorkflows({
  gh,
  baseSHA,
  pullNumber,
  changedActionsWithLatestVersion
}: {
  gh: GithubCommonProps;
  baseSHA: string;
  pullNumber: number;
  // key/latest version branch
  changedActionsWithLatestVersion: Record<string, number | undefined>;
}): Promise<string[]> {
  const allWorkflows = (await fs.readdir(workflowsDir))
    .filter((p) => /^(wf|workflow)-.+\.yml$/.test(p))
    .map((p) => p.replace(/\.yml$/, ''));
  const diffLines = await gitDiffLines(baseSHA);

  const changedWorkflows = new Set<string>();

  for (const workflowName of allWorkflows) {
    // Check if any related files have changes
    if (
      (
        await getChangedFiles({
          baseSHA,
          regex: [
            // Workflow config
            new RegExp(
              '^' +
                escapeRegExp(
                  `${path.resolve(workflowsConfigsDir)}/${workflowName}.config.yml`
                ) +
                '$'
            ),

            // Workflow file and related YML files
            new RegExp(
              '^' +
                escapeRegExp(`.github/workflows/${workflowName}`) +
                '(\\..+)?\\.yml$'
            ),

            // Readme file
            new RegExp(
              '^' + escapeRegExp(`.github/workflows/${workflowName}.README.md`)
            )
          ],

          ignoreDeletions: true
        })
      ).length > 0
    ) {
      console.log(
        `Found changed workflow ${workflowName} because of related files`
      );
      changedWorkflows.add(workflowName);
    }
  }

  // Find all workflows that are using one of the changed actions
  for (const changedAction in changedActionsWithLatestVersion) {
    const latestVersion = changedActionsWithLatestVersion[changedAction];
    const suffixes = [
      ...(latestVersion ? [`v${latestVersion}`] : []),
      getPRSuffix(pullNumber)
    ];
    for (const [
      changedWorkflow,
      variant
    ] of await getGitHubWorkflowsUsingAction(
      `${gh.repoProps.owner}/${gh.repoProps.repo}`,
      changedAction,
      suffixes
    )) {
      console.log(
        `Found changed workflow ${changedWorkflow} because of related action ${changedAction}/${variant} changed`
      );
      changedWorkflows.add(changedWorkflow);
    }
  }

  // Find workflows that have a custom "change files pattern"
  {
    for (const workflowName of allWorkflows) {
      const workflowConfig = await getWorkflowConfig(
        path.join(workflowsConfigsDir, `${workflowName}.config.yml`)
      );
      if (workflowConfig.changesPaths) {
        const matches = micromatch(
          diffLines.map(([, p]) => p),
          workflowConfig.changesPaths
        );
        if (matches.length > 0) {
          console.log(
            `Found changed workflow ${workflowName} because of workflow-configured changesPaths`
          );
          changedWorkflows.add(workflowName);
        }
      }
    }
  }

  return Array.from(changedWorkflows);
}
