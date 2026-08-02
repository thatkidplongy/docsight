import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { Bbox } from '../../lib/pipeline/geometry';
import { loadFilingPdf } from '../../lib/pdf/loader';

interface PdfViewerProps {
  documentId: string;
  page: number;
  highlight?: Bbox;
  onPageChange: (page: number) => void;
}

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Maps a PDF user space point through the viewport matrix into CSS pixels. */
const applyViewportTransform = (transform: number[], x: number, y: number): [number, number] => [
  transform[0] * x + transform[2] * y + transform[4],
  transform[1] * x + transform[3] * y + transform[5],
];

const PdfViewer = ({ documentId, page, highlight, onPageChange }: PdfViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setError(null);

    loadFilingPdf(documentId)
      .then(loaded => {
        if (!cancelled) setPdf(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;

    let cancelled = false;
    const canvas = canvasRef.current;
    const containerWidth = containerRef.current.clientWidth;

    const renderPage = async (): Promise<void> => {
      const pdfPage = await pdf.getPage(Math.min(Math.max(page, 1), pdf.numPages));

      if (cancelled) return;

      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const cssScale = containerWidth / baseViewport.width;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      // Rendering at DPR resolution through the viewport scale (rather than a
      // canvas transform) keeps one code path for both drawing and hit math.
      const renderViewport = pdfPage.getViewport({ scale: cssScale * devicePixelRatio });
      const cssViewport = pdfPage.getViewport({ scale: cssScale });

      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;

      renderTaskRef.current?.cancel();
      const renderTask = pdfPage.render({ canvas, viewport: renderViewport });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch {
        // A cancelled render throws; the replacement render owns the canvas now.
        return;
      }

      if (cancelled || !highlight) {
        setHighlightRect(null);
        return;
      }

      const [x, y, width, height] = highlight;
      const [x1, y1] = applyViewportTransform(cssViewport.transform, x, y);
      const [x2, y2] = applyViewportTransform(cssViewport.transform, x + width, y + height);

      setHighlightRect({
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    };

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, page, highlight]);

  if (error) {
    return <p className="p-6 text-sm text-red-400">Could not load the PDF: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border border-neutral-700 px-3 py-1 hover:border-neutral-500 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          Page {page}
          {pdf ? ` of ${pdf.numPages}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={pdf !== null && page >= pdf.numPages}
          className="rounded border border-neutral-700 px-3 py-1 hover:border-neutral-500 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded border border-neutral-800 bg-white">
        <canvas ref={canvasRef} />
        {highlightRect && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-cyan-400 bg-cyan-400/20"
            style={highlightRect}
          />
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
