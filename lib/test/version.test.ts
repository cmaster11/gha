/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { describe } from 'node:test';
import {
  increaseSemver,
  semverSort,
  semverSortDesc,
  VersionLabel
} from '../version.js';

describe('version', () => {
  const tags = [
    '1.0.0',
    '1.0.1-aaa.1',
    '1.0.1-prerel.0',
    '1.0.1-prerel.1',
    '1.0.1',
    '2.0.0',
    '3.0.0'
  ];

  test('semverSort', () => {
    expect([...tags].sort(semverSort)).toEqual([...tags]);
  });

  test('semverSortDesc', () => {
    expect([...tags].sort(semverSortDesc)).toEqual([...tags].reverse());
  });

  describe('increaseSemver', () => {
    const tests: {
      tag: string;
      versionLabel: VersionLabel;
      preReleasePrefix?: string;
      usePrereleaseReleaseType?: boolean;
      expected: string;
    }[] = [
      {
        tag: '1.0.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'myprefix',
        expected: '1.1.0-myprefix.0'
      },
      {
        tag: '1.0.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'myprefix',
        usePrereleaseReleaseType: true,
        expected: '1.0.1-myprefix.0'
      },
      {
        tag: '1.0.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'my-prefix',
        expected: '1.1.0-my-prefix.0'
      },
      {
        tag: '1.1.0-myprefix.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'myprefix',
        expected: '1.2.0-myprefix.0'
      },
      {
        tag: '1.1.0-myprefix.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'myprefix2',
        expected: '1.2.0-myprefix2.0'
      },
      {
        tag: '1.1.0-myprefix.0',
        versionLabel: VersionLabel.minor,
        expected: '1.1.0'
      },
      {
        tag: '1.1.0-myprefix.0',
        versionLabel: VersionLabel.minor,
        preReleasePrefix: 'myprefix',
        usePrereleaseReleaseType: true,
        expected: '1.1.0-myprefix.1'
      },
      {
        tag: '1.1.0',
        versionLabel: VersionLabel.minor,
        usePrereleaseReleaseType: true,
        expected: '1.1.1-0'
      }
    ];
    test.each(tests)('%p', (t) => {
      expect(
        increaseSemver(
          t.tag,
          t.versionLabel,
          t.preReleasePrefix,
          t.usePrereleaseReleaseType
        )
      ).toEqual(t.expected);
    });
  });
});
