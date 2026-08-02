import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Chunk } from '../../src/lib/types';
import { buildDocumentIndex, type DocumentIndex } from '../../src/lib/retrieval/search';

const INDEX_DIR = path.resolve('public/data/index');

export const loadDocumentIndex = async (documentId: string): Promise<DocumentIndex> => {
  const chunks = JSON.parse(await readFile(path.join(INDEX_DIR, `${documentId}.chunks.json`), 'utf8')) as Chunk[];
  const bin = await readFile(path.join(INDEX_DIR, `${documentId}.embeddings.bin`));
  const embeddings = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);

  return buildDocumentIndex(chunks, embeddings);
};
