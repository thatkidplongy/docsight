/**
 * Single source of truth for index artifact names. The ingest script writes
 * these and both readers (Node script, browser hook) request them, so a
 * convention change here must not need three coordinated edits.
 */
export const MANIFEST_FILENAME = 'manifest.json';

export const buildChunksFilename = (documentId: string): string => `${documentId}.chunks.json`;

export const buildEmbeddingsFilename = (documentId: string): string => `${documentId}.embeddings.bin`;

export const buildFilingFilename = (documentId: string): string => `${documentId}.pdf`;

export const buildDemoFilename = (documentId: string): string => `${documentId}.json`;

/** Public URL roots for the browser; the scripts resolve their own local paths. */
export const INDEX_URL = '/data/index';
export const FILINGS_URL = '/data/filings';
export const DEMO_URL = '/data/demo';
export const RESULTS_URL = '/data/results/results.json';
