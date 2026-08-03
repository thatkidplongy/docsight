/**
 * Fetches each company's latest 10-K from EDGAR, prints it to PDF with headless
 * Chrome, then hands the bytes to the shared pipeline. This script owns only
 * fetching and file I/O; the extract, chunk and embed logic lives in
 * src/lib/pipeline so the browser uploader runs the identical path.
 *
 * Run with: npm run ingest            (all companies)
 *           npm run ingest -- AAPL    (one company)
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ManifestEntry } from '../src/lib/types';
import { buildDocumentAssets } from '../src/lib/pipeline/document';
import {
  buildChunksFilename,
  buildEmbeddingsFilename,
  buildFilingFilename,
  MANIFEST_FILENAME,
} from '../src/lib/retrieval/index-files';
import { COMPANIES, findLatestTenK } from './lib/edgar';
import { createPdfConverter, type PdfConverter } from './lib/html-to-pdf';
import { runCli } from './lib/cli';
import { FILINGS_DIR, INDEX_DIR } from './lib/paths';

const MANIFEST_PATH = path.join(INDEX_DIR, MANIFEST_FILENAME);

const fileExists = (filePath: string): Promise<boolean> =>
  access(filePath).then(
    () => true,
    () => false
  );

const readManifest = async (): Promise<ManifestEntry[]> => {
  if (!(await fileExists(MANIFEST_PATH))) return [];

  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as ManifestEntry[];
};

const runIngest = async (): Promise<void> => {
  const onlyTicker = process.argv[2]?.toUpperCase();
  const companies = onlyTicker ? COMPANIES.filter(company => company.ticker === onlyTicker) : COMPANIES;

  if (companies.length === 0) {
    throw new Error(`Unknown ticker: ${onlyTicker}. Known tickers: ${COMPANIES.map(c => c.ticker).join(', ')}`);
  }

  await mkdir(FILINGS_DIR, { recursive: true });
  await mkdir(INDEX_DIR, { recursive: true });

  let manifest = await readManifest();
  let converter: PdfConverter | null = null;

  try {
    for (const company of companies) {
      const id = company.ticker.toLowerCase();
      const pdfPath = path.join(FILINGS_DIR, buildFilingFilename(id));
      const filing = await findLatestTenK(company.ticker);

      if (await fileExists(pdfPath)) {
        console.log(`[${company.ticker}] PDF already present, skipping fetch`);
      } else {
        console.log(`[${company.ticker}] printing ${filing.form} filed ${filing.filingDate} to PDF`);
        converter ??= await createPdfConverter();
        await converter.convertUrlToPdf(filing.url, pdfPath);
      }

      const { chunks, embeddings, pageCount } = await buildDocumentAssets(id, new Uint8Array(await readFile(pdfPath)));
      console.log(`[${company.ticker}] ${pageCount} pages, ${chunks.length} chunks embedded`);

      await writeFile(path.join(INDEX_DIR, buildChunksFilename(id)), JSON.stringify(chunks));
      await writeFile(
        path.join(INDEX_DIR, buildEmbeddingsFilename(id)),
        Buffer.from(embeddings.buffer, embeddings.byteOffset, embeddings.byteLength)
      );

      manifest = [
        ...manifest.filter(existing => existing.id !== id),
        {
          id,
          ticker: company.ticker,
          company: company.name,
          form: filing.form,
          filingDate: filing.filingDate,
          pages: pageCount,
          chunkCount: chunks.length,
        },
      ];
      await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      console.log(`[${company.ticker}] indexed`);
    }
  } finally {
    await converter?.close();
  }

  console.log(`Done. ${manifest.length} documents in the manifest.`);
};

runCli(runIngest);
