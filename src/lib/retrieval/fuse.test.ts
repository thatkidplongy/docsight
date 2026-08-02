import { describe, expect, it } from 'vitest';
import { fuseRankings } from './fuse';

describe('fuseRankings', () => {
  it('puts an item ranked first by both lists on top', () => {
    const fused = fuseRankings([
      [5, 2, 9],
      [5, 9, 2],
    ]);

    expect(fused[0].index).toBe(5);
  });

  it('lifts an item ranked well by both lists above one ranked first by only one', () => {
    const fused = fuseRankings([
      [1, 3, 0],
      [2, 3, 0],
    ]);

    // 3 is second in both lists; 1 and 2 are each first in only one list.
    expect(fused[0].index).toBe(3);
  });

  it('includes items that appear in only one ranking', () => {
    const fused = fuseRankings([[7], [8]]);

    expect(fused.map(result => result.index).sort()).toEqual([7, 8]);
  });

  it('returns empty for no rankings', () => {
    expect(fuseRankings([])).toEqual([]);
  });
});
