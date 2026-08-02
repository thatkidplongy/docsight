import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const documentCache = new Map<string, Promise<PDFDocumentProxy>>();

/** Loads a filing PDF once per session; repeated viewers share the proxy. */
export const loadFilingPdf = (documentId: string): Promise<PDFDocumentProxy> => {
  const cached = documentCache.get(documentId);

  if (cached) return cached;

  const loading = getDocument({ url: `/data/filings/${documentId}.pdf` }).promise;
  documentCache.set(documentId, loading);

  return loading;
};
