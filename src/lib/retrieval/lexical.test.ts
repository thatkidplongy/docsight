import { describe, expect, it } from 'vitest';
import { buildLexicalIndex, scoreLexical } from './lexical';

describe('scoreLexical', () => {
  const index = buildLexicalIndex([
    'research and development expense was 34,550 million',
    'land and buildings machinery and equipment',
    'the company sells consumer electronics worldwide',
  ]);

  it('ranks the chunk containing the query terms highest', () => {
    const scores = scoreLexical(index, 'research and development');

    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[0]).toBeGreaterThan(scores[2]);
  });

  it('gives zero to chunks sharing no terms with the query', () => {
    const scores = scoreLexical(index, 'quarterly dividend');

    expect(scores).toEqual([0, 0, 0]);
  });

  it('weights rare terms above common ones', () => {
    const scores = scoreLexical(index, 'development and');

    // "and" appears in two chunks; "development" only in the first, so the
    // first chunk must dominate on the rare term.
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it('handles an empty corpus', () => {
    expect(scoreLexical(buildLexicalIndex([]), 'anything')).toEqual([]);
  });
});
