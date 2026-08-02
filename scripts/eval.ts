/**
 * Phase 5: runs the gold set against each configured provider and scores
 * accuracy, citation validity and refusal behaviour. Results are written to
 * data/results/ and rendered by the benchmark page.
 *
 * Run with: npm run eval
 */
const runEval = async (): Promise<void> => {
  throw new Error('Not implemented yet. The eval harness lands in phase 5.');
};

runEval().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
