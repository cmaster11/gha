/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { GithubCommonProps } from './github-common.js';
import { $enum } from 'ts-enum-util';
import {
  findReleaseLabel,
  NoReleaseReleaseLabel,
  ReleaseLabel
} from './version.js';

export interface GitHubGetPrLabelsOpts {
  gh: GithubCommonProps;
  pullNumber: number;
}

/**
 * Gets the list of labels associated with the provided PR
 */
export async function githubGetPrLabels(
  opts: GitHubGetPrLabelsOpts
): Promise<string[]> {
  // Get the date of the creation of the tag
  const pr = await opts.gh.octokit.pulls.get({
    ...opts.gh.repoProps,
    pull_number: opts.pullNumber
  });
  return pr.data.labels.map((l) => l.name);
}

export async function githubGetPrReleaseLabel(
  opts: GitHubGetPrLabelsOpts,
  throwIfNoneFound = true
): Promise<ReleaseLabel | undefined> {
  const labels = await githubGetPrLabels(opts);
  const label = findReleaseLabel(labels);
  if (label === false) {
    return;
  }

  if (label == null && throwIfNoneFound)
    throw new Error(
      `No release labels found. The PR needs to contain at least one of the following labels: ` +
        [
          $enum(ReleaseLabel).getValues(),
          $enum(NoReleaseReleaseLabel).getValues()
        ]
          .flat()
          .join(', ')
    );

  return label;
}
