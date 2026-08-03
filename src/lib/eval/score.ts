import type { GoldItem, ModelResult, QuestionResult } from '../types';
import { normalizeForMatching } from '../utils/text';

/**
 * Numbers are compared with commas stripped so "34,550" matches "34550" and
 * "$34,550 million"; matching stays substring based because gold entries list
 * the acceptable phrasings explicitly.
 */
const foldNumbers = (text: string): string => normalizeForMatching(text).replace(/,/g, '');

export const matchesExpected = (answerText: string, expected: string[]): boolean => {
  const folded = foldNumbers(answerText);

  return expected.some(variant => folded.includes(foldNumbers(variant)));
};

const divideOrZero = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

const averageBy = (results: QuestionResult[], pick: (result: QuestionResult) => number): number =>
  divideOrZero(
    results.reduce((sum, result) => sum + pick(result), 0),
    results.length
  );

export const summarizeModel = (model: string, gold: GoldItem[], perQuestion: QuestionResult[]): ModelResult => {
  const goldById = new Map(gold.map(item => [item.id, item]));
  const answerable = perQuestion.filter(result => !goldById.get(result.id)?.refusalExpected);
  const probes = perQuestion.filter(result => goldById.get(result.id)?.refusalExpected);
  const answered = answerable.filter(result => !result.refused && !result.error);

  return {
    model,
    accuracy: divideOrZero(answerable.filter(result => result.correct).length, answerable.length),
    refusalAccuracy: divideOrZero(probes.filter(result => result.correct).length, probes.length),
    citationRate: divideOrZero(answered.filter(result => result.citationValid).length, answered.length),
    avgLatencyMs: averageBy(perQuestion, result => result.latencyMs),
    avgConfidence: averageBy(perQuestion, result => result.confidence),
    perQuestion,
  };
};
