import path from 'node:path';

/** Local filesystem roots. The browser uses the URL constants in src/lib/retrieval/index-files.ts. */
export const FILINGS_DIR = path.resolve('public/data/filings');
export const INDEX_DIR = path.resolve('public/data/index');
export const DEMO_DIR = path.resolve('public/data/demo');
export const RESULTS_PATH = path.resolve('public/data/results/results.json');

export const GOLD_PATH = path.resolve('data/gold/gold.json');
export const MODELS_PATH = path.resolve('data/gold/models.json');
export const DEMO_QUESTIONS_PATH = path.resolve('data/gold/demo-questions.json');
