import { describe, expect, it } from 'vitest';
import { matchesExpected, summarizeModel, type GoldItem, type QuestionResult } from './score';

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
});

describe('summarizeModel', () => {
  const gold: GoldItem[] = [
    { id: 'q1', documentId: 'aapl', question: 'a', expected: ['1'], refusalExpected: false },
    { id: 'q2', documentId: 'aapl', question: 'b', expected: ['2'], refusalExpected: false },
    { id: 'p1', documentId: 'aapl', question: 'c', refusalExpected: true },
  ];

  const perQuestion: QuestionResult[] = [
    {
      id: 'q1',
      documentId: 'aapl',
      correct: true,
      refused: false,
      citationValid: true,
      confidence: 0.8,
      latencyMs: 100,
    },
    {
      id: 'q2',
      documentId: 'aapl',
      correct: false,
      refused: false,
      citationValid: false,
      confidence: 0.4,
      latencyMs: 200,
    },
    {
      id: 'p1',
      documentId: 'aapl',
      correct: true,
      refused: true,
      citationValid: false,
      confidence: 0.3,
      latencyMs: 300,
    },
  ];

  it('separates accuracy, refusal accuracy and citation rate', () => {
    const summary = summarizeModel('test/model', gold, perQuestion);

    expect(summary.accuracy).toBe(0.5);
    expect(summary.refusalAccuracy).toBe(1);
    expect(summary.citationRate).toBe(0.5);
    expect(summary.avgLatencyMs).toBe(200);
  });
});
