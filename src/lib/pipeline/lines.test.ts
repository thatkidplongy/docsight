import { describe, expect, it } from 'vitest';
import { buildLines } from './lines';

describe('buildLines', () => {
  it('joins fragments on the same baseline, closing sub word gaps', () => {
    const lines = buildLines([
      { text: 'R', bbox: [10, 700, 8, 10] },
      { text: '&D expense', bbox: [18.4, 700, 60, 10] },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('R&D expense');
  });

  it('keeps a space between fragments separated by a word gap', () => {
    const lines = buildLines([
      { text: 'total', bbox: [10, 700, 20, 10] },
      { text: 'revenue', bbox: [36, 700, 30, 10] },
    ]);

    expect(lines[0].text).toBe('total revenue');
  });

  it('orders lines top to bottom despite input order', () => {
    const lines = buildLines([
      { text: 'lower line', bbox: [10, 100, 50, 10] },
      { text: 'upper line', bbox: [10, 700, 50, 10] },
    ]);

    expect(lines.map(line => line.text)).toEqual(['upper line', 'lower line']);
  });

  it('groups fragments within the baseline tolerance onto one line', () => {
    const lines = buildLines([
      { text: 'left', bbox: [10, 700, 20, 10] },
      { text: 'right', bbox: [40, 701.5, 20, 10] },
    ]);

    expect(lines).toHaveLength(1);
  });

  it('drops whitespace only fragments', () => {
    expect(buildLines([{ text: '   ', bbox: [0, 0, 5, 5] }])).toEqual([]);
  });
});
