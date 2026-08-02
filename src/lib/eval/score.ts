import { normalizeForMatching } from '../utils/text';

export interface GoldItem {
  id: string;
  documentId: string;
  question: string;
  /** Acceptable answer fragments; any match scores as correct. Absent for refusal probes. */
  expected?: string[];
  refusalExpected: boolean;
}

export interface QuestionResult {
  id: string;
  documentId: string;
  correct: boolean;
  refused: boolean;
  citationValid: boolean;
  confidence: number;
  latencyMs: number;
  error?: string;
}

export interface ModelResult {
  model: string;
  /** Fraction of answerable questions answered correctly. */
  accuracy: number;
  /** Fraction of refusal probes correctly declined. */
  refusalAccuracy: number;
  /** Fraction of non refused answers carrying at least one verified citation. */
  citationRate: number;
  avgLatencyMs: number;
  avgConfidence: number;
  perQuestion: QuestionResult[];
}

export interface ResultsFile {
  generatedAt: string;
  goldSetSize: number;
  models: ModelResult[];
}

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

export const summarizeModel = (model: string, gold: GoldItem[], perQuestion: QuestionResult[]): ModelResult => {
  const goldById = new Map(gold.map(item => [item.id, item]));
  const answerable = perQuestion.filter(result => !goldById.get(result.id)?.refusalExpected);
  const probes = perQuestion.filter(result => goldById.get(result.id)?.refusalExpected);
  const answered = answerable.filter(result => !result.refused && !result.error);

  const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

  return {
    model,
    accuracy: ratio(answerable.filter(result => result.correct).length, answerable.length),
    refusalAccuracy: ratio(probes.filter(result => result.correct).length, probes.length),
    citationRate: ratio(answered.filter(result => result.citationValid).length, answered.length),
    avgLatencyMs: ratio(
      perQuestion.reduce((sum, result) => sum + result.latencyMs, 0),
      perQuestion.length
    ),
    avgConfidence: ratio(
      perQuestion.reduce((sum, result) => sum + result.confidence, 0),
      perQuestion.length
    ),
    perQuestion,
  };
};
