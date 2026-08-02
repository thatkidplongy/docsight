import { describe, expect, it } from 'vitest';
import { unionBboxes } from './geometry';

describe('unionBboxes', () => {
  it('returns the box itself for a single box', () => {
    expect(unionBboxes([[10, 20, 30, 40]])).toEqual([10, 20, 30, 40]);
  });

  it('unions disjoint boxes into the smallest covering rectangle', () => {
    expect(
      unionBboxes([
        [0, 0, 10, 10],
        [20, 30, 10, 10],
      ])
    ).toEqual([0, 0, 30, 40]);
  });

  it('handles boxes contained within another box', () => {
    expect(
      unionBboxes([
        [0, 0, 100, 100],
        [10, 10, 5, 5],
      ])
    ).toEqual([0, 0, 100, 100]);
  });

  it('throws on an empty list', () => {
    expect(() => unionBboxes([])).toThrow('empty list');
  });
});
