/**
 * Phase 5 harness: runs the gold set against each configured model and writes
 * public/data/results/results.json for the benchmark page.
 *
 * Run with: npm run eval            (all models)
 *           npm run eval -- qwen3:4b   (one model)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedTexts } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import type { DocumentIndex } from '../src/lib/retrieval/search';
import {
  matchesExpected,
  summarizeModel,
  type GoldItem,
  type ModelResult,
  type QuestionResult,
} from '../src/lib/eval/score';
import { loadDocumentIndex } from './lib/load-index';

const GOLD_PATH = path.resolve('data/gold/gold.json');
const RESULTS_PATH = path.resolve('public/data/results/results.json');

/** think is only sent to models that support it; qwen3 answers better with it. */
const MODELS: { model: string; think?: boolean }[] = [
  { model: 'qwen3:4b', think: true },
  { model: 'llama3.2:3b' },
  { model: 'gemma3:4b' },
];

const indexCache = new Map<string, Promise<DocumentIndex>>();

const getIndex = (documentId: string): Promise<DocumentIndex> => {
  const cached = indexCache.get(documentId);

  if (cached) return cached;

  const loading = loadDocumentIndex(documentId);
  indexCache.set(documentId, loading);

  return loading;
};

const evaluateQuestion = async (provider: OllamaProvider, item: GoldItem): Promise<QuestionResult> => {
  const startedAt = performance.now();

  try {
    const index = await getIndex(item.documentId);
    const answer = await askQuestion(
      { provider, embedQuery: async text => await embedTexts([text]) },
      index,
      item.question
    );

    const correct = item.refusalExpected
      ? answer.refused
      : !answer.refused && matchesExpected(answer.text, item.expected ?? []);

    return {
      id: item.id,
      documentId: item.documentId,
      correct,
      refused: answer.refused,
      citationValid: answer.citations.some(citation => citation.verified),
      confidence: answer.confidence.overall,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      id: item.id,
      documentId: item.documentId,
      correct: false,
      refused: false,
      citationValid: false,
      confidence: 0,
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const runEval = async (): Promise<void> => {
  const onlyModel = process.argv[2];
  const modelSpecs = onlyModel ? MODELS.filter(spec => spec.model === onlyModel) : MODELS;

  if (modelSpecs.length === 0) {
    throw new Error(`Unknown model: ${onlyModel}. Known: ${MODELS.map(spec => spec.model).join(', ')}`);
  }

  const gold = JSON.parse(await readFile(GOLD_PATH, 'utf8')) as GoldItem[];
  const models: ModelResult[] = [];

  for (const spec of modelSpecs) {
    const provider = new OllamaProvider(spec);
    const perQuestion: QuestionResult[] = [];

    console.log(`=== ${provider.name} ===`);

    for (const [position, item] of gold.entries()) {
      const result = await evaluateQuestion(provider, item);
      perQuestion.push(result);

      const status = result.error ? `ERROR ${result.error}` : result.correct ? 'correct' : 'wrong';
      console.log(`[${provider.name}] ${position + 1}/${gold.length} ${item.id}: ${status} (${result.latencyMs}ms)`);
    }

    models.push(summarizeModel(provider.name, gold, perQuestion));
  }

  const results = { generatedAt: new Date().toISOString(), goldSetSize: gold.length, models };
  await writeFile(RESULTS_PATH, JSON.stringify(results, null, 2));

  for (const model of models) {
    console.log(
      `${model.model}: accuracy ${(model.accuracy * 100).toFixed(0)}%, refusals ${(model.refusalAccuracy * 100).toFixed(0)}%, citations ${(model.citationRate * 100).toFixed(0)}%, avg ${(model.avgLatencyMs / 1000).toFixed(1)}s`
    );
  }
};

runEval().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
