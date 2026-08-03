/**
 * Ask a question against an ingested filing from the terminal.
 *
 * Run with: npm run ask -- AAPL "How much did Apple spend on research and development?"
 */
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedQuery } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import { loadDocumentIndex } from './lib/load-index';
import { runCli } from './lib/cli';

const runAsk = async (): Promise<void> => {
  const [ticker, ...questionParts] = process.argv.slice(2);
  const question = questionParts.join(' ');

  if (!ticker || !question) {
    throw new Error('Usage: npm run ask -- <TICKER> "<question>"');
  }

  const index = await loadDocumentIndex(ticker.toLowerCase());
  const provider = new OllamaProvider();
  const answer = await askQuestion({ provider, embedQuery }, index, question);

  console.log(`\nmodel: ${answer.model}`);
  console.log(`refused: ${answer.refused}`);
  console.log(`answer: ${answer.text}\n`);

  for (const citation of answer.citations) {
    const status = citation.verified ? `VERIFIED page ${citation.page}` : 'UNSUPPORTED';
    console.log(`  [${status}] "${citation.quote}"`);
  }

  const { retrieval, spanVerification, selfConsistency, overall } = answer.confidence;
  console.log(
    `\nconfidence: ${overall.toFixed(2)} (retrieval ${retrieval.toFixed(2)}, spans ${spanVerification.toFixed(2)}, consistency ${selfConsistency.toFixed(2)})`
  );
};

runCli(runAsk);
