export interface FusedResult {
  index: number;
  score: number;
}

/**
 * Reciprocal rank fusion. Combining ranks instead of raw scores sidesteps the
 * incomparable scales of BM25 and cosine similarity; k=60 is the standard
 * damping constant from the original RRF paper.
 */
const RRF_K = 60;

export const fuseRankings = (rankings: number[][]): FusedResult[] => {
  const scores = new Map<number, number>();

  for (const ranking of rankings) {
    ranking.forEach((itemIndex, rank) => {
      scores.set(itemIndex, (scores.get(itemIndex) ?? 0) + 1 / (RRF_K + rank + 1));
    });
  }

  return [...scores.entries()].map(([index, score]) => ({ index, score })).sort((a, b) => b.score - a.score);
};
