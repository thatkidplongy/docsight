/**
 * Phase 1: downloads SEC filings, extracts text with page and bounding box
 * coordinates via pdf.js, chunks it with provenance intact, embeds each chunk
 * locally, and writes the index to data/. Runs on the developer machine only.
 *
 * Run with: npm run ingest
 */
const runIngest = async (): Promise<void> => {
  throw new Error('Not implemented yet. Ingestion lands in phase 1.');
};

runIngest().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
