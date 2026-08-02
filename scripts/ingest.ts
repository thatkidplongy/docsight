/**
 * Phase 1 pipeline: for each company, fetch the latest 10-K from EDGAR, print
 * it to PDF with headless Chrome, extract text with coordinates, chunk it with
 * provenance intact, embed locally, and write the index to data/.
 *
 * Run with: npm run ingest            (all companies)
 *           npm run ingest -- AAPL    (one company)
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { COMPANIES, findLatestTenK } from './lib/edgar';
import { createPdfConverter, type PdfConverter } from './lib/html-to-pdf';
import { buildChunks } from '../src/lib/pipeline/chunk';
import { embedTexts } from '../src/lib/pipeline/embed';
import { extractPages } from '../src/lib/pipeline/extract';

const FILINGS_DIR = path.resolve('public/data/filings');
const INDEX_DIR = path.resolve('public/data/index');
const MANIFEST_PATH = path.join(INDEX_DIR, 'manifest.json');

interface ManifestEntry {
  id: string;
  ticker: string;
  company: string;
  form: string;
  filingDate: string;
  pages: number;
  chunkCount: number;
}

const fileExists = (filePath: string): Promise<boolean> =>
  access(filePath).then(
    () => true,
    () => false
  );

const readManifest = async (): Promise<ManifestEntry[]> => {
  if (!(await fileExists(MANIFEST_PATH))) return [];

  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as ManifestEntry[];
};

const upsertManifestEntry = (manifest: ManifestEntry[], entry: ManifestEntry): ManifestEntry[] => [
  ...manifest.filter(existing => existing.id !== entry.id),
  entry,
];

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
      const pdfPath = path.join(FILINGS_DIR, `${id}.pdf`);
      const filing = await findLatestTenK(company.ticker);

      if (await fileExists(pdfPath)) {
        console.log(`[${company.ticker}] PDF already present, skipping fetch`);
      } else {
        console.log(`[${company.ticker}] printing ${filing.form} filed ${filing.filingDate} to PDF`);
        converter ??= await createPdfConverter();
        await converter.convertUrlToPdf(filing.url, pdfPath);
      }

      const pages = await extractPages(new Uint8Array(await readFile(pdfPath)));
      const chunks = buildChunks(id, pages);
      console.log(`[${company.ticker}] ${pages.length} pages, ${chunks.length} chunks, embedding...`);

      const embeddings = await embedTexts(chunks.map(chunk => chunk.text));

      await writeFile(path.join(INDEX_DIR, `${id}.chunks.json`), JSON.stringify(chunks));
      await writeFile(
        path.join(INDEX_DIR, `${id}.embeddings.bin`),
        Buffer.from(embeddings.buffer, embeddings.byteOffset, embeddings.byteLength)
      );

      manifest = upsertManifestEntry(manifest, {
        id,
        ticker: company.ticker,
        company: company.name,
        form: filing.form,
        filingDate: filing.filingDate,
        pages: pages.length,
        chunkCount: chunks.length,
      });
      await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      console.log(`[${company.ticker}] indexed`);
    }
  } finally {
    await converter?.close();
  }

  console.log(`Done. ${manifest.length} documents in the manifest.`);
};

runIngest().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
