/**
 * Answers the suggested demo questions once and writes public/data/demo/, so
 * the deployed site serves instant answers at zero inference cost.
 *
 * Run with: npm run precompute            (all documents)
 *           npm run precompute -- aapl    (one document)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DemoFile, DemoItem } from '../src/lib/types';
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedQuery } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import { buildDemoFilename } from '../src/lib/retrieval/index-files';
import { loadDocumentIndex } from './lib/load-index';
import { runCli } from './lib/cli';
import { DEMO_DIR, DEMO_QUESTIONS_PATH } from './lib/paths';

/** Extra samples per question, so precomputed answers carry a real consistency signal. */
const CONSISTENCY_SAMPLES = 2;

const runPrecompute = async (): Promise<void> => {
  const onlyId = process.argv[2]?.toLowerCase();
  const questionsByDocument = JSON.parse(await readFile(DEMO_QUESTIONS_PATH, 'utf8')) as Record<string, string[]>;
  const entries = Object.entries(questionsByDocument).filter(([id]) => !onlyId || id === onlyId);

  if (entries.length === 0) {
    throw new Error(`Unknown document id: ${onlyId}. Known: ${Object.keys(questionsByDocument).join(', ')}`);
  }

  const provider = new OllamaProvider();
  const deps = { provider, embedQuery };

  for (const [documentId, questions] of entries) {
    const index = await loadDocumentIndex(documentId);
    const items: DemoItem[] = [];

    for (const question of questions) {
      console.log(`[${documentId}] ${question}`);
      const attempt = () => askQuestion(deps, index, question, { consistencySamples: CONSISTENCY_SAMPLES });

      try {
        let answer;

        try {
          answer = await attempt();
        } catch (firstError) {
          console.log(`[${documentId}]   retrying after: ${String(firstError)}`);
          answer = await attempt();
        }

        items.push({ question, answer });
        console.log(
          `[${documentId}]   -> ${answer.text.slice(0, 80)} (confidence ${answer.confidence.overall.toFixed(2)})`
        );
      } catch (error) {
        // A missing suggested question beats an aborted precompute run.
        console.log(`[${documentId}]   SKIPPED after retry: ${String(error)}`);
      }
    }

    const file: DemoFile = { generatedAt: new Date().toISOString(), model: provider.name, items };
    await writeFile(path.join(DEMO_DIR, buildDemoFilename(documentId)), JSON.stringify(file, null, 2));
  }
};

runCli(runPrecompute);
