import { describe } from 'node:test';
import { semverSort, semverSortDesc } from '../version.js';

describe('version', () => {
  const tags = ['1.0.0', '1.0.1', '2.0.0'];

  test('semverSort', () => {
    expect([...tags].sort(semverSort)).toEqual([...tags]);
  });

  test('semverSortDesc', () => {
    expect([...tags].sort(semverSortDesc)).toEqual([...tags].reverse());
  });
});
