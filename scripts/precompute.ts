/**
 * Phase 6: answers the suggested demo questions once with the best local
 * model (with self consistency sampling) and writes public/data/demo/, so the
 * deployed site serves instant answers at zero inference cost.
 *
 * Run with: npm run precompute            (all documents)
 *           npm run precompute -- aapl    (one document)
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedTexts } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import { loadDocumentIndex } from './lib/load-index';

const DEMO_DIR = path.resolve('public/data/demo');

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  aapl: [
    "What were Apple's total net sales in fiscal 2025?",
    'How much did Apple spend on research and development in fiscal 2025?',
  ],
  nvda: ["What was Nvidia's revenue in fiscal 2026?", "What was Nvidia's net income in fiscal 2026?"],
  tsla: ["What were Tesla's total revenues in 2025?", 'How much did Tesla spend on research and development in 2025?'],
  msft: ["What was Microsoft's total revenue in fiscal 2026?", "What was Microsoft's net income in fiscal 2026?"],
  amzn: ["What were Amazon's total net sales in 2025?", "What was Amazon's net income in 2025?"],
  dis: ["What were Disney's total revenues in fiscal 2025?", "What was Disney's net income in fiscal 2025?"],
  nflx: ["What were Netflix's total revenues in 2025?", "What was Netflix's net income in 2025?"],
  nke: ["What was Nike's net income in fiscal 2026?", "What was Nike's demand creation expense in fiscal 2026?"],
  mcd: ["What were McDonald's total revenues in 2025?", "What was McDonald's net income in 2025?"],
  jpm: ["What was JPMorgan's net income in 2025?", "What was JPMorgan's total net revenue on a managed basis in 2025?"],
};

const runPrecompute = async (): Promise<void> => {
  const onlyId = process.argv[2]?.toLowerCase();
  const entries = Object.entries(SUGGESTED_QUESTIONS).filter(([id]) => !onlyId || id === onlyId);

  if (entries.length === 0) {
    throw new Error(`Unknown document id: ${onlyId}`);
  }

  const provider = new OllamaProvider({ think: true });

  const deps = { provider, embedQuery: async (text: string) => await embedTexts([text]) };

  for (const [documentId, questions] of entries) {
    const index = await loadDocumentIndex(documentId);
    const items = [];

    for (const question of questions) {
      console.log(`[${documentId}] ${question}`);

      try {
        let answer;

        try {
          answer = await askQuestion(deps, index, question, { consistencySamples: 2 });
        } catch (firstError) {
          console.log(`[${documentId}]   retrying after: ${String(firstError)}`);
          answer = await askQuestion(deps, index, question, { consistencySamples: 2 });
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

    await writeFile(
      path.join(DEMO_DIR, `${documentId}.json`),
      JSON.stringify({ generatedAt: new Date().toISOString(), model: provider.name, items }, null, 2)
    );
  }
};

runPrecompute().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
