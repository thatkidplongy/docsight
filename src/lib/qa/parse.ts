import type { RawModelAnswer, RawSpan } from './prompt';

/**
 * Structured output makes malformed replies rare, not impossible; smaller
 * models still occasionally wrap JSON in prose or code fences, so parsing
 * extracts the outermost object before validating.
 */
const extractJsonObject = (text: string): string => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new Error(`Model reply contains no JSON object: ${text.slice(0, 120)}`);
  }

  return text.slice(start, end + 1);
};

const isRawSpan = (value: unknown): value is RawSpan => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return typeof candidate.chunkId === 'string' && typeof candidate.quote === 'string';
};

export const parseModelAnswer = (text: string): RawModelAnswer => {
  const value = JSON.parse(extractJsonObject(text)) as Record<string, unknown>;

  if (typeof value.answer !== 'string') {
    throw new Error('Model reply is missing a string "answer" field');
  }

  const spans = Array.isArray(value.spans) ? value.spans.filter(isRawSpan) : [];

  return {
    answer: value.answer,
    refused: value.refused === true,
    spans,
  };
};
