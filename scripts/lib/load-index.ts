import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Chunk } from '../../src/lib/types';
import { buildDocumentIndex, type DocumentIndex } from '../../src/lib/retrieval/search';
import { buildChunksFilename, buildEmbeddingsFilename } from '../../src/lib/retrieval/index-files';
import { INDEX_DIR } from './paths';

export const loadDocumentIndex = async (documentId: string): Promise<DocumentIndex> => {
  const chunks = JSON.parse(await readFile(path.join(INDEX_DIR, buildChunksFilename(documentId)), 'utf8')) as Chunk[];
  const bin = await readFile(path.join(INDEX_DIR, buildEmbeddingsFilename(documentId)));

  return buildDocumentIndex(chunks, new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4));
};
