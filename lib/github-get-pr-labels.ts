import { GithubCommonProps } from './github-common.js';
import { $enum } from 'ts-enum-util';
import { NoReleaseVersionLabel, VersionLabel } from './version.js';

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

export async function githubGetPrVersionLabel(
  opts: GitHubGetPrLabelsOpts,
  throwIfNoneFound = true
): Promise<VersionLabel | undefined> {
  const labels = await githubGetPrLabels(opts);
  if (labels.includes(NoReleaseVersionLabel['no-release'])) {
    console.log(`Found ${NoReleaseVersionLabel['no-release']} label`);
    return;
  }

  if (labels.includes(VersionLabel.major)) return VersionLabel.major;
  if (labels.includes(VersionLabel.minor)) return VersionLabel.minor;
  if (labels.includes(VersionLabel.patch)) return VersionLabel.patch;

  if (throwIfNoneFound)
    throw new Error(
      `No version labels found. The PR needs to contain at least one of the following labels: ${[$enum(VersionLabel).getValues(), $enum(NoReleaseVersionLabel).getValues()].flat().join(',')}`
    );

  return;
}
