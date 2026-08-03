import { describe, expect, it } from 'vitest';
import type { Chunk } from '../types';
import type { RetrievedChunk } from '../retrieval/search';
import { ANSWER_JSON_SCHEMA, buildAnswerMessages } from './prompt';

const buildRetrieved = (id: string, text: string, page: number): RetrievedChunk => ({
  chunk: { id, documentId: 'aapl', text, page, bbox: [0, 0, 10, 10] } satisfies Chunk,
  denseScore: 0.5,
  lexicalScore: 1,
  fusedScore: 0.03,
});

describe('buildAnswerMessages', () => {
  const retrieved = [
    buildRetrieved('aapl-126', 'Research and development $ 34,550', 36),
    buildRetrieved('aapl-169', 'Total net sales $ 416,161', 44),
  ];

  it('puts the grounding rules in a system message and the task in a user message', () => {
    const [system, user] = buildAnswerMessages('How much on R&D?', retrieved);

    expect(system.role).toBe('system');
    expect(user.role).toBe('user');
    expect(buildAnswerMessages('q', retrieved)).toHaveLength(2);
  });

  it('labels every passage with its chunk id so spans can be attributed', () => {
    const [, user] = buildAnswerMessages('How much on R&D?', retrieved);

    expect(user.content).toContain('[aapl-126]');
    expect(user.content).toContain('[aapl-169]');
  });

  it('includes each passage page number and body text', () => {
    const [, user] = buildAnswerMessages('How much on R&D?', retrieved);

    expect(user.content).toContain('page 36');
    expect(user.content).toContain('Research and development $ 34,550');
  });

  it('includes the question verbatim', () => {
    const [, user] = buildAnswerMessages('How much did Apple spend on R&D?', retrieved);

    expect(user.content).toContain('Question: How much did Apple spend on R&D?');
  });

  it('instructs the model to quote verbatim and to refuse when unsupported', () => {
    const [system] = buildAnswerMessages('q', retrieved);

    expect(system.content).toMatch(/VERBATIM/);
    expect(system.content).toMatch(/refused/);
  });

  it('handles an empty passage list without inventing content', () => {
    const [, user] = buildAnswerMessages('q', []);

    expect(user.content).toContain('Passages:');
    expect(user.content).toContain('Question: q');
  });
});

describe('ANSWER_JSON_SCHEMA', () => {
  it('requires the three fields the parser depends on', () => {
    expect(ANSWER_JSON_SCHEMA.required).toEqual(['answer', 'refused', 'spans']);
  });

  it('requires a chunkId and quote on every span', () => {
    const properties = ANSWER_JSON_SCHEMA.properties as Record<string, { items?: { required?: string[] } }>;

    expect(properties.spans.items?.required).toEqual(['chunkId', 'quote']);
  });
});
