import { tokenize } from '../utils/text';

/**
 * BM25 needs corpus statistics, so the index is built once per document and
 * reused across queries. Retrieval scope is always a single filing.
 */
export interface LexicalIndex {
  chunkTermCounts: Map<string, number>[];
  chunkLengths: number[];
  documentFrequency: Map<string, number>;
  averageLength: number;
}

const K1 = 1.5;
const B = 0.75;

export const buildLexicalIndex = (texts: string[]): LexicalIndex => {
  const chunkTermCounts: Map<string, number>[] = [];
  const chunkLengths: number[] = [];
  const documentFrequency = new Map<string, number>();
  let totalLength = 0;

  for (const text of texts) {
    const tokens = tokenize(text);
    const counts = new Map<string, number>();

    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }

    for (const term of counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }

    chunkTermCounts.push(counts);
    chunkLengths.push(tokens.length);
    totalLength += tokens.length;
  }

  return {
    chunkTermCounts,
    chunkLengths,
    documentFrequency,
    averageLength: texts.length > 0 ? totalLength / texts.length : 0,
  };
};

/** BM25 score of the query against every chunk, in chunk order. */
export const scoreLexical = (index: LexicalIndex, query: string): number[] => {
  const queryTerms = [...new Set(tokenize(query))];
  const totalChunks = index.chunkTermCounts.length;

  return index.chunkTermCounts.map((counts, chunkIndex) => {
    const length = index.chunkLengths[chunkIndex];

    if (length === 0) return 0;

    let score = 0;

    for (const term of queryTerms) {
      const termFrequency = counts.get(term) ?? 0;

      if (termFrequency === 0) continue;

      const df = index.documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (totalChunks - df + 0.5) / (df + 0.5));
      const lengthNormalization = 1 - B + (B * length) / index.averageLength;

      score += (idf * termFrequency * (K1 + 1)) / (termFrequency + K1 * lengthNormalization);
    }

    return score;
  });
};
