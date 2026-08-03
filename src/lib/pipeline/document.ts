import type { Chunk } from '../types';
import { buildChunks } from './chunk';
import { embedTexts } from './embed';
import { extractPages } from './extract';

export interface DocumentAssets {
  chunks: Chunk[];
  embeddings: Float32Array;
  pageCount: number;
}

/**
 * Owns the extract, chunk and embed composition so the ingest script and the
 * browser uploader run identical logic rather than two drifting copies. Callers
 * supply the bytes and decide what to do with the result; this function does no
 * file or network I/O.
 */
export const buildDocumentAssets = async (documentId: string, pdfBytes: Uint8Array): Promise<DocumentAssets> => {
  const pages = await extractPages(pdfBytes);
  const chunks = buildChunks(documentId, pages);

  if (chunks.length === 0) {
    throw new Error(`No extractable text found in ${documentId}; is the PDF scanned images only?`);
  }

  const embeddings = await embedTexts(chunks.map(chunk => chunk.text));

  return { chunks, embeddings, pageCount: pages.length };
};
