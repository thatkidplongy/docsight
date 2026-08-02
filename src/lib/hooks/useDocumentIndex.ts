import { useEffect, useState } from 'react';
import type { Chunk } from '../types';
import { buildDocumentIndex, type DocumentIndex } from '../retrieval/search';

const indexCache = new Map<string, Promise<DocumentIndex>>();

const fetchDocumentIndex = (documentId: string): Promise<DocumentIndex> => {
  const cached = indexCache.get(documentId);

  if (cached) return cached;

  const loading = (async () => {
    const [chunksResponse, embeddingsResponse] = await Promise.all([
      fetch(`/data/index/${documentId}.chunks.json`),
      fetch(`/data/index/${documentId}.embeddings.bin`),
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

export const useDocumentIndex = (documentId: string | null): DocumentIndexState => {
  const [state, setState] = useState<DocumentIndexState>({ index: null, error: null });

  useEffect(() => {
    if (!documentId) {
      setState({ index: null, error: null });
      return;
    }

    let cancelled = false;
    setState({ index: null, error: null });

    fetchDocumentIndex(documentId)
      .then(index => {
        if (!cancelled) setState({ index, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ index: null, error: error instanceof Error ? error.message : String(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return state;
};
