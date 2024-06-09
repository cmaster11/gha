/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { workflowsDir } from './constants.js';
import { parse } from 'yaml';
import path from 'node:path';

interface GithubWorkflowJobStep {
  uses?: string;
}

interface GithubWorkflowJob {
  steps?: GithubWorkflowJobStep[];
}

interface GithubWorkflow {
  jobs?: Record<string, GithubWorkflowJob>;
}

export async function getGitHubWorkflows(): Promise<string[]> {
  return (await fs.readdir(workflowsDir)).filter((f) =>
    /^workflow-.+\.yml$/.test(f)
  );
}

export async function getGitHubWorkflowsUsingAction(
  repository: string,
  actionName: string,
  versionSuffixes: string[]
): Promise<[string, string][]> {
  const possibleVariants = versionSuffixes.map(
    (v) => `${repository}@${actionName}/${v}`
  );

  const workflowsUsingAction: [string, string][] = [];
  const allWorkflows = await getGitHubWorkflows();
  for (const workflow of allWorkflows) {
    const content = parse(
      await fs.readFile(path.join(workflowsDir, workflow), 'utf-8')
    ) as GithubWorkflow;

    // Find if the workflow has any steps that refer to the specified action
    for (const jobsKey in content.jobs) {
      for (const step of content.jobs[jobsKey].steps ?? []) {
        for (const variant of possibleVariants) {
          if (step.uses && step.uses == variant) {
            workflowsUsingAction.push([workflow, variant]);
            break;
          }
        }
      }
    }
  }

  return workflowsUsingAction;
}
