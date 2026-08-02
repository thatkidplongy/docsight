import type { Chunk, SpanCitation } from '../types';
import { normalizeForMatching } from '../utils/text';
import type { RawSpan } from './prompt';

/**
 * The anti hallucination gate: a quote only becomes a renderable citation if
 * it literally exists in the chunk the model attributed it to. Matching is
 * done on normalised text (case, unicode punctuation, whitespace) because
 * models fold PDF typography into ASCII.
 */
export const verifySpans = (chunks: Chunk[], spans: RawSpan[]): SpanCitation[] => {
  const chunksById = new Map(chunks.map(chunk => [chunk.id, chunk]));

  return spans.map(span => {
    const chunk = chunksById.get(span.chunkId);

    if (!chunk) {
      return { quote: span.quote, chunkId: span.chunkId, verified: false };
    }

    const found = normalizeForMatching(chunk.text).includes(normalizeForMatching(span.quote));

    if (!found) {
      return { quote: span.quote, chunkId: span.chunkId, verified: false };
    }

    return {
      quote: span.quote,
      chunkId: span.chunkId,
      verified: true,
      page: chunk.page,
      bbox: chunk.bbox,
    };
  });
};
