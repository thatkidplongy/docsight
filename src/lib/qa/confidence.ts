import type { ConfidenceBreakdown, SpanCitation } from '../types';

/**
 * Weights are a documented editorial choice, not learned values: span
 * verification dominates because it is the only signal computed against
 * ground truth; retrieval similarity is a prior; self consistency is a
 * tiebreaker sampled at temperature.
 */
const WEIGHTS = {
  retrieval: 0.35,
  spanVerification: 0.45,
  selfConsistency: 0.2,
};

/** Consistency defaults to neutral when it was not measured (zero extra samples). */
const NEUTRAL_CONSISTENCY = 0.5;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export interface ConfidenceInput {
  topDenseScore: number;
  citations: SpanCitation[];
  selfConsistency?: number;
}

export const composeConfidence = (input: ConfidenceInput): ConfidenceBreakdown => {
  const retrieval = clamp01(input.topDenseScore);

  const spanVerification =
    input.citations.length > 0
      ? input.citations.filter(citation => citation.verified).length / input.citations.length
      : 0;

  const selfConsistency = input.selfConsistency ?? NEUTRAL_CONSISTENCY;

  const overall =
    WEIGHTS.retrieval * retrieval +
    WEIGHTS.spanVerification * spanVerification +
    WEIGHTS.selfConsistency * selfConsistency;

  return {
    retrieval,
    spanVerification,
    selfConsistency,
    overall: clamp01(overall),
  };
};
