import { describe, expect, it } from 'vitest';
import type { Line } from './lines';
import { buildChunks } from './chunk';

const buildLine = (text: string, y: number): Line => ({ text, bbox: [10, y, 500, 12] });

describe('buildChunks', () => {
  it('produces one chunk for a short page', () => {
    const chunks = buildChunks('doc', [{ page: 1, lines: [buildLine('alpha', 700), buildLine('beta', 680)] }]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ id: 'doc-0', documentId: 'doc', page: 1, text: 'alpha beta' });
  });

  it('splits once the character target is reached', () => {
    const longLine = 'x'.repeat(600);
    const chunks = buildChunks('doc', [
      { page: 1, lines: [buildLine(longLine, 700), buildLine(longLine, 680), buildLine('tail', 660)] },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[1].text).toBe('tail');
  });

  it('never crosses a page boundary', () => {
    const chunks = buildChunks('doc', [
      { page: 1, lines: [buildLine('page one', 700)] },
      { page: 2, lines: [buildLine('page two', 700)] },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks.map(chunk => chunk.page)).toEqual([1, 2]);
  });

  it('unions line boxes into the chunk bbox', () => {
    const chunks = buildChunks('doc', [
      {
        page: 1,
        lines: [
          { text: 'a', bbox: [10, 690, 100, 10] },
          { text: 'b', bbox: [10, 670, 200, 10] },
        ],
      },
    ]);

    expect(chunks[0].bbox).toEqual([10, 670, 200, 30]);
  });

  it('skips pages with no usable text', () => {
    expect(buildChunks('doc', [{ page: 1, lines: [] }])).toEqual([]);
  });
});
