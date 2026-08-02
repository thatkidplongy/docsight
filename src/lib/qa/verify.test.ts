import { describe, expect, it } from 'vitest';
import type { Chunk } from '../types';
import { verifySpans } from './verify';

const CHUNK: Chunk = {
  id: 'aapl-126',
  documentId: 'aapl',
  text: 'Operating expenses: Research and development $ 34,550 10 % $ 31,370 — the Company’s largest line item',
  page: 36,
  bbox: [42, 100, 528, 200],
};

describe('verifySpans', () => {
  it('verifies a verbatim quote and attaches page and bbox', () => {
    const [citation] = verifySpans([CHUNK], [{ chunkId: 'aapl-126', quote: 'Research and development $ 34,550' }]);

    expect(citation.verified).toBe(true);
    expect(citation.page).toBe(36);
    expect(citation.bbox).toEqual(CHUNK.bbox);
  });

  it('verifies despite case and unicode punctuation differences', () => {
    const [citation] = verifySpans([CHUNK], [{ chunkId: 'aapl-126', quote: "the company's largest line item" }]);

    expect(citation.verified).toBe(true);
  });

  it('rejects a quote that is not in the chunk', () => {
    const [citation] = verifySpans([CHUNK], [{ chunkId: 'aapl-126', quote: 'net sales were $391 billion' }]);

    expect(citation.verified).toBe(false);
    expect(citation.page).toBeUndefined();
  });

  it('rejects a quote attributed to an unknown chunk', () => {
    const [citation] = verifySpans([CHUNK], [{ chunkId: 'missing', quote: 'Research and development' }]);

    expect(citation.verified).toBe(false);
  });
});
