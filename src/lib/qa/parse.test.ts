import { describe, expect, it } from 'vitest';
import { parseModelAnswer } from './parse';

describe('parseModelAnswer', () => {
  it('parses a clean JSON reply', () => {
    const parsed = parseModelAnswer(
      '{"answer": "R&D was $34,550 million.", "refused": false, "spans": [{"chunkId": "aapl-126", "quote": "Research and development $ 34,550"}]}'
    );

    expect(parsed.answer).toContain('34,550');
    expect(parsed.refused).toBe(false);
    expect(parsed.spans).toHaveLength(1);
  });

  it('extracts JSON wrapped in code fences or prose', () => {
    const parsed = parseModelAnswer('Here you go:\n```json\n{"answer": "x", "refused": true, "spans": []}\n```');

    expect(parsed.refused).toBe(true);
  });

  it('drops malformed span entries instead of failing', () => {
    const parsed = parseModelAnswer(
      '{"answer": "x", "refused": false, "spans": [{"chunkId": 1}, {"chunkId": "a", "quote": "b"}]}'
    );

    expect(parsed.spans).toEqual([{ chunkId: 'a', quote: 'b' }]);
  });

  it('throws when there is no JSON at all', () => {
    expect(() => parseModelAnswer('I cannot answer that.')).toThrow('no JSON object');
  });

  it('throws when answer is missing', () => {
    expect(() => parseModelAnswer('{"refused": false, "spans": []}')).toThrow('missing a string');
  });
});
