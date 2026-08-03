import { useEffect, useState } from 'react';
import type { Chunk } from '../types';
import { buildDocumentIndex, type DocumentIndex } from '../retrieval/search';
import { buildChunksFilename, buildEmbeddingsFilename, INDEX_URL } from '../retrieval/index-files';

/**
 * Indexes are cached for the session because building the BM25 side costs a
 * full pass over every chunk; ten documents of embeddings is tens of MB, which
 * is an acceptable trade for instant document switching.
 */
const indexCache = new Map<string, Promise<DocumentIndex>>();

const fetchDocumentIndex = (documentId: string): Promise<DocumentIndex> => {
  const cached = indexCache.get(documentId);

  if (cached) return cached;

  const loading = (async () => {
    const [chunksResponse, embeddingsResponse] = await Promise.all([
      fetch(`${INDEX_URL}/${buildChunksFilename(documentId)}`),
      fetch(`${INDEX_URL}/${buildEmbeddingsFilename(documentId)}`),
    ]);

    if (!chunksResponse.ok || !embeddingsResponse.ok) {
      throw new Error(`index fetch failed for ${documentId}`);
    }

    const chunks = (await chunksResponse.json()) as Chunk[];
    const buffer = await embeddingsResponse.arrayBuffer();

    return buildDocumentIndex(chunks, new Float32Array(buffer));
  })();

  indexCache.set(documentId, loading);

  return loading;
};

interface DocumentIndexState {
  index: DocumentIndex | null;
  error: string | null;
}

const EMPTY: DocumentIndexState = { index: null, error: null };

export const useDocumentIndex = (documentId: string | null): DocumentIndexState => {
  const [state, setState] = useState<DocumentIndexState>(EMPTY);

  useEffect(() => {
    if (!documentId) {
      setState(EMPTY);
      return;
    }

    let cancelled = false;
    setState(EMPTY);

    fetchDocumentIndex(documentId)
      .then(index => {
        if (!cancelled) setState({ index, error: null });
      })
      .catch((error: unknown) => {
        // A failed index is not cached, so switching back retries rather than
        // replaying the rejection forever.
        indexCache.delete(documentId);

        if (!cancelled) setState({ index: null, error: error instanceof Error ? error.message : String(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return state;
};
