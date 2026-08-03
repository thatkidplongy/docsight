import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { buildFilingFilename, FILINGS_URL } from '../retrieval/index-files';

GlobalWorkerOptions.workerSrc = workerUrl;

const documentCache = new Map<string, Promise<PDFDocumentProxy>>();

/** Loads a filing PDF once per session; repeated viewers share the proxy. */
export const loadFilingPdf = (documentId: string): Promise<PDFDocumentProxy> => {
  const cached = documentCache.get(documentId);

  if (cached) return cached;

  const loading = getDocument({ url: `${FILINGS_URL}/${buildFilingFilename(documentId)}` }).promise;

  // A failed load must not be cached, or switching back replays the rejection.
  loading.catch(() => documentCache.delete(documentId));
  documentCache.set(documentId, loading);

  return loading;
};
