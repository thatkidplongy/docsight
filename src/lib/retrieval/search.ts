import type { Chunk } from '../types';
import { EMBEDDING_DIMS } from '../pipeline/embed';
import { buildLexicalIndex, scoreLexical, type LexicalIndex } from './lexical';
import { fuseRankings } from './fuse';

export interface DocumentIndex {
  chunks: Chunk[];
  embeddings: Float32Array;
  lexical: LexicalIndex;
}

export interface RetrievedChunk {
  chunk: Chunk;
  denseScore: number;
  lexicalScore: number;
  fusedScore: number;
}

/** Each retriever nominates this many candidates before fusion. */
const CANDIDATE_POOL = 20;

const DEFAULT_TOP_K = 6;

export const buildDocumentIndex = (chunks: Chunk[], embeddings: Float32Array): DocumentIndex => {
  if (embeddings.length !== chunks.length * EMBEDDING_DIMS) {
    throw new Error(
      `Embedding count mismatch: ${embeddings.length} floats for ${chunks.length} chunks of ${EMBEDDING_DIMS} dims`
    );
  }

  return { chunks, embeddings, lexical: buildLexicalIndex(chunks.map(chunk => chunk.text)) };
};

/** Dot product equals cosine similarity because embeddings are L2 normalised. */
const scoreDense = (embeddings: Float32Array, query: Float32Array): number[] => {
  const count = embeddings.length / EMBEDDING_DIMS;
  const scores = new Array<number>(count);

  for (let i = 0; i < count; i++) {
    let score = 0;
    const offset = i * EMBEDDING_DIMS;

    for (let dim = 0; dim < EMBEDDING_DIMS; dim++) {
      score += query[dim] * embeddings[offset + dim];
    }

    scores[i] = score;
  }

  return scores;
};

const rankTop = (scores: number[], pool: number): number[] =>
  scores
    .map((score, index) => ({ score, index }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, pool)
    .map(entry => entry.index);

/**
 * Hybrid retrieval: dense cosine and BM25 each nominate candidates, and
 * reciprocal rank fusion merges them. Dense-only ranking demonstrably
 * misranks financial tables (see CLAUDE_GOTCHAS.md).
 */
export const searchIndex = (
  index: DocumentIndex,
  queryEmbedding: Float32Array,
  queryText: string,
  topK: number = DEFAULT_TOP_K
): RetrievedChunk[] => {
  const denseScores = scoreDense(index.embeddings, queryEmbedding);
  const lexicalScores = scoreLexical(index.lexical, queryText);

  const fused = fuseRankings([rankTop(denseScores, CANDIDATE_POOL), rankTop(lexicalScores, CANDIDATE_POOL)]);

  return fused.slice(0, topK).map(result => ({
    chunk: index.chunks[result.index],
    denseScore: denseScores[result.index],
    lexicalScore: lexicalScores[result.index],
    fusedScore: result.score,
  }));
};
