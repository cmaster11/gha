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
import { actionsDir } from '../constants.js';
import path from 'node:path';
import klaw from 'klaw';
import type { GithubCommonProps } from '../github-common.js';
import { gitHubCreateOrUpdateComment } from '../github-comments.js';
import { getGitHubWorkflowsUsingAction } from '../github-workflows.js';
import { getPRSuffix } from '../version.js';
import micromatch from 'micromatch';

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
      if (match == null) return n;
      const num = parseInt(match[1]);
      if (num > n) return num;
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
      '### [cmaster11/gha]',
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

  if (changesPathsJs.length > 0) {
    // If any JS-related files change, rebuild all JS actions
    const diffLines = await gitDiffLines(baseSHA);

    if (
      micromatch(
        diffLines.map(([, p]) => p),
        changesPathsJs
      ).length > 0
    ) {
      const allActions = await fs.readdir(actionsDir);
      for (const actionName of allActions) {
        const actionDir = path.join(actionsDir, actionName);
        for await (const file of klaw(actionDir, {
          filter: (f) => /\.m?[tj]s$/.test(f)
        })) {
          if (file.stats.isDirectory()) {
            continue;
          }
          console.log(
            `Found changed JS file because of global JS changes ${file.path}`
          );
          changedActions.add(actionName);
          break;
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
  const changedWorkflows = new Set<string>([
    ...(
      await getChangedFiles({
        baseSHA,
        regex: /^\.github\/workflows\/(test-)?(?:workflow|wf)-[^.]+\.yml$/,
        ignoreDeletions: true
      })
    ).map((d) => {
      const newValue = d.replace(
        /^\.github\/workflows\/(?:test-)?((?:workflow|wf)-.+)\.yml$/,
        '$1'
      );
      console.log(
        `Found changed workflow ${newValue} because of changed workflow${/\/test-/.test(d) ? ' test' : ''} file`
      );
      return newValue;
    })
  ]);

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

  return Array.from(changedWorkflows);
}
