/**
 * Ask a question against an ingested filing from the terminal.
 *
 * Run with: npm run ask -- AAPL "How much did Apple spend on research and development?"
 */
import { OllamaProvider } from '../src/lib/providers/ollama';
import { embedTexts } from '../src/lib/pipeline/embed';
import { askQuestion } from '../src/lib/qa/ask';
import { loadDocumentIndex } from './lib/load-index';

const runAsk = async (): Promise<void> => {
  const [ticker, ...questionParts] = process.argv.slice(2);
  const question = questionParts.join(' ');

  if (!ticker || !question) {
    throw new Error('Usage: npm run ask -- <TICKER> "<question>"');
  }

  const index = await loadDocumentIndex(ticker.toLowerCase());
  // Thinking markedly improves answer quality on qwen3; Ollama keeps the
  // reasoning separate from the JSON constrained content.
  const provider = new OllamaProvider({ think: true });

  const answer = await askQuestion({ provider, embedQuery: async text => await embedTexts([text]) }, index, question);

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

runAsk().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
