/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { ReleaseType } from 'semver';
import * as semver from 'semver';

export enum ReleaseLabel {
  patch = 'patch',
  minor = 'minor',
  major = 'major'
}

export enum NoReleaseReleaseLabel {
  'no-release' = 'no-release'
}

export function semverSort(a: string, b: string): number {
  return semver.lt(a, b) ? -1 : 1;
}

export function semverSortDesc(a: string, b: string): number {
  return semver.lt(a, b) ? 1 : -1;
}

export function getLatestTagSemVer(tags: string[], prefix: string): string {
  return tags.length == 0
    ? '0.0.0'
    : tags.map((t) => t.substring(prefix.length)).sort(semverSortDesc)[0];
}

export function increaseSemver(
  tag: string,
  releaseLabel: ReleaseLabel,
  preReleasePrefix?: string,
  usePrereleaseReleaseType?: boolean
): string {
  let releaseType: ReleaseType = releaseLabel;
  if (usePrereleaseReleaseType) {
    releaseType = 'prerelease';
  } else if (preReleasePrefix) {
    releaseType = ('pre' + releaseLabel) as ReleaseType;
  }
  const newVersion = semver.inc(tag, releaseType, false, preReleasePrefix);
  if (newVersion == null)
    throw new Error(
      `Invalid semver increase request for tag ${tag} and release label ${releaseLabel}`
    );
  return newVersion;
}

export function getPRSuffix(pullNumber: number) {
  return `pr-${pullNumber}`;
}

export function getPRDevBranch(actionName: string, pullNumber: number) {
  const branchSuffix = 'dev-' + getPRSuffix(pullNumber);
  return `${actionName}/${branchSuffix}`;
}

export function getPRDevBranchGlob(pullNumber: number) {
  const branchSuffix = 'dev-' + getPRSuffix(pullNumber);
  return `action-*/${branchSuffix}`;
}

export function findReleaseLabel(
  labels: string[]
): ReleaseLabel | false | undefined {
  if (labels.includes(NoReleaseReleaseLabel['no-release'])) {
    console.log(`Found ${NoReleaseReleaseLabel['no-release']} label`);
    return false;
  }

  if (labels.includes(ReleaseLabel.major)) return ReleaseLabel.major;
  if (labels.includes(ReleaseLabel.minor)) return ReleaseLabel.minor;
  if (labels.includes(ReleaseLabel.patch)) return ReleaseLabel.patch;

  return;
}
