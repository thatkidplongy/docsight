import { describe, expect, it } from 'vitest';
import type { GoldItem, QuestionResult } from '../types';
import { matchesExpected, summarizeModel } from './score';

describe('matchesExpected', () => {
  it('matches a table figure inside a sentence', () => {
    expect(matchesExpected('Apple spent $34,550 million on R&D.', ['34,550'])).toBe(true);
  });

  it('matches across comma formatting differences', () => {
    expect(matchesExpected('R&D expense was 34550 million dollars', ['34,550'])).toBe(true);
  });

  it('accepts any listed variant', () => {
    expect(matchesExpected('about 34.55 billion dollars', ['34,550', '34.55 billion'])).toBe(true);
  });

  it('rejects an answer with the wrong figure', () => {
    expect(matchesExpected('R&D expense was $31,370 million', ['34,550'])).toBe(false);
  });

  it('rejects when there are no expected variants', () => {
    expect(matchesExpected('anything at all', [])).toBe(false);
  });
});

describe('summarizeModel', () => {
  const gold: GoldItem[] = [
    { id: 'q1', documentId: 'aapl', question: 'a', expected: ['1'], refusalExpected: false },
    { id: 'q2', documentId: 'aapl', question: 'b', expected: ['2'], refusalExpected: false },
    { id: 'p1', documentId: 'aapl', question: 'c', refusalExpected: true },
  ];

  const buildResult = (id: string, overrides: Partial<QuestionResult> = {}): QuestionResult => ({
    id,
    documentId: 'aapl',
    correct: false,
    refused: false,
    citationValid: false,
    confidence: 0,
    latencyMs: 0,
    ...overrides,
  });

  it('separates accuracy, refusal accuracy and citation rate', () => {
    const summary = summarizeModel('test/model', gold, [
      buildResult('q1', { correct: true, citationValid: true, confidence: 0.8, latencyMs: 100 }),
      buildResult('q2', { confidence: 0.4, latencyMs: 200 }),
      buildResult('p1', { correct: true, refused: true, confidence: 0.3, latencyMs: 300 }),
    ]);

    expect(summary.accuracy).toBe(0.5);
    expect(summary.refusalAccuracy).toBe(1);
    expect(summary.citationRate).toBe(0.5);
    expect(summary.avgLatencyMs).toBe(200);
  });

  it('excludes errored answers from the citation denominator', () => {
    const summary = summarizeModel('test/model', gold, [
      buildResult('q1', { correct: true, citationValid: true }),
      buildResult('q2', { error: 'boom' }),
      buildResult('p1', { correct: true, refused: true }),
    ]);

    // Only q1 counts as answered, and it cited correctly.
    expect(summary.citationRate).toBe(1);
  });

  it('returns zeroes rather than NaN for an empty run', () => {
    const summary = summarizeModel('test/model', gold, []);

    expect(summary.accuracy).toBe(0);
    expect(summary.citationRate).toBe(0);
    expect(summary.avgLatencyMs).toBe(0);
  });
});
