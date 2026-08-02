import { describe, expect, it } from 'vitest';
import type { SpanCitation } from '../types';
import { composeConfidence } from './confidence';

const verifiedCitation: SpanCitation = { quote: 'q', chunkId: 'c', verified: true, page: 1, bbox: [0, 0, 1, 1] };
const failedCitation: SpanCitation = { quote: 'q', chunkId: 'c', verified: false };

describe('composeConfidence', () => {
  it('scores high when every signal is strong', () => {
    const confidence = composeConfidence({
      topDenseScore: 0.9,
      citations: [verifiedCitation, verifiedCitation],
      selfConsistency: 1,
    });

    expect(confidence.overall).toBeGreaterThan(0.85);
    expect(confidence.spanVerification).toBe(1);
  });

  it('collapses span verification when quotes fail', () => {
    const confidence = composeConfidence({
      topDenseScore: 0.9,
      citations: [failedCitation, verifiedCitation],
    });

    expect(confidence.spanVerification).toBe(0.5);
  });

  it('gives zero span score to an answer with no citations at all', () => {
    const confidence = composeConfidence({ topDenseScore: 0.5, citations: [] });

    expect(confidence.spanVerification).toBe(0);
  });

  it('uses a neutral consistency when unmeasured', () => {
    const confidence = composeConfidence({ topDenseScore: 0.5, citations: [verifiedCitation] });

    expect(confidence.selfConsistency).toBe(0.5);
  });

  it('clamps a negative cosine similarity to zero', () => {
    const confidence = composeConfidence({ topDenseScore: -0.2, citations: [] });

    expect(confidence.retrieval).toBe(0);
  });
});
