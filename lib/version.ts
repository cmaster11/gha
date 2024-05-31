import * as semver from 'semver';

export enum VersionLabel {
  patch = 'patch',
  minor = 'minor',
  major = 'major'
}

export enum NoReleaseVersionLabel {
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
  versionLabel: VersionLabel
): string {
  const newVersion = semver.inc(tag, versionLabel);
  if (newVersion == null)
    throw new Error(
      `Invalid semver increase request for tag ${tag} and version label ${versionLabel}`
    );
  return newVersion;
}
