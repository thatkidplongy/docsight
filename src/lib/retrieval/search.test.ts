import { describe, expect, it } from 'vitest';
import type { Chunk } from '../types';
import { EMBEDDING_DIMS } from '../pipeline/embed';
import { buildDocumentIndex, searchIndex } from './search';

const buildChunk = (id: string, text: string): Chunk => ({
  id,
  documentId: 'doc',
  text,
  page: 1,
  bbox: [0, 0, 10, 10],
});

/** A unit vector with all weight on one dimension keeps the math legible. */
const buildEmbedding = (hotDim: number): number[] => {
  const values = new Array<number>(EMBEDDING_DIMS).fill(0);
  values[hotDim] = 1;
  return values;
};

describe('searchIndex', () => {
  const chunks = [
    buildChunk('a', 'research and development expense totals'),
    buildChunk('b', 'unrelated marketing narrative'),
  ];
  const embeddings = new Float32Array([...buildEmbedding(0), ...buildEmbedding(1)]);
  const index = buildDocumentIndex(chunks, embeddings);

  it('ranks a chunk first when both retrievers agree', () => {
    const results = searchIndex(index, new Float32Array(buildEmbedding(0)), 'research and development');

    expect(results[0].chunk.id).toBe('a');
    expect(results[0].denseScore).toBeCloseTo(1);
    expect(results[0].lexicalScore).toBeGreaterThan(0);
  });

  it('surfaces a lexically matching chunk even when dense scoring prefers another', () => {
    // Dense query points at chunk b, but the words match chunk a.
    const results = searchIndex(index, new Float32Array(buildEmbedding(1)), 'research and development expense');

    expect(results.map(result => result.chunk.id)).toContain('a');
  });

  it('rejects embeddings whose length disagrees with the chunk count', () => {
    expect(() => buildDocumentIndex(chunks, new Float32Array(3))).toThrow('mismatch');
  });
});
