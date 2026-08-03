/**
 * Runs the gold set against each configured model and writes
 * public/data/results/results.json for the benchmark page.
 *
 * Run with: npm run eval               (every model in data/gold/models.json)
 *           npm run eval -- qwen3:4b   (one model)
 */
import { readFile, writeFile } from 'node:fs/promises';
import type { GoldItem, ModelResult, QuestionResult, ResultsFile } from '../src/lib/types';
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedQuery } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import type { DocumentIndex } from '../src/lib/retrieval/search';
import { matchesExpected, summarizeModel } from '../src/lib/eval/score';
import { formatDuration, formatPercent } from '../src/lib/utils/format';
import { loadDocumentIndex } from './lib/load-index';
import { runCli } from './lib/cli';
import { GOLD_PATH, MODELS_PATH, RESULTS_PATH } from './lib/paths';

interface ModelSpec {
  model: string;
}

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
    const answer = await askQuestion({ provider, embedQuery }, index, item.question);

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

const describeResult = (result: QuestionResult): string => {
  if (result.error) return `ERROR ${result.error}`;

  return result.correct ? 'correct' : 'wrong';
};

const evaluateModel = async (spec: ModelSpec, gold: GoldItem[]): Promise<ModelResult> => {
  const provider = new OllamaProvider(spec);
  const perQuestion: QuestionResult[] = [];

  console.log(`=== ${provider.name} ===`);

  for (const [position, item] of gold.entries()) {
    let result = await evaluateQuestion(provider, item);

    // One retry absorbs transient failures (sampling noise, a looping
    // generation) without letting a flaky question stall the whole run.
    if (result.error) {
      console.log(`[${provider.name}] retrying ${item.id} after: ${result.error}`);
      result = await evaluateQuestion(provider, item);
    }

    perQuestion.push(result);
    console.log(
      `[${provider.name}] ${position + 1}/${gold.length} ${item.id}: ${describeResult(result)} (${result.latencyMs}ms)`
    );
  }

  return summarizeModel(provider.name, gold, perQuestion);
};

const runEval = async (): Promise<void> => {
  const onlyModel = process.argv[2];
  const allSpecs = JSON.parse(await readFile(MODELS_PATH, 'utf8')) as ModelSpec[];
  const specs = onlyModel ? allSpecs.filter(spec => spec.model === onlyModel) : allSpecs;

  if (specs.length === 0) {
    throw new Error(`Unknown model: ${onlyModel}. Known: ${allSpecs.map(spec => spec.model).join(', ')}`);
  }

  const gold = JSON.parse(await readFile(GOLD_PATH, 'utf8')) as GoldItem[];
  const models: ModelResult[] = [];

  for (const spec of specs) {
    models.push(await evaluateModel(spec, gold));
  }

  const results: ResultsFile = { generatedAt: new Date().toISOString(), goldSetSize: gold.length, models };
  await writeFile(RESULTS_PATH, JSON.stringify(results, null, 2));

  for (const model of models) {
    console.log(
      `${model.model}: accuracy ${formatPercent(model.accuracy)}, refusals ${formatPercent(model.refusalAccuracy)}, citations ${formatPercent(model.citationRate)}, avg ${formatDuration(model.avgLatencyMs)}`
    );
  }
};

runCli(runEval);
