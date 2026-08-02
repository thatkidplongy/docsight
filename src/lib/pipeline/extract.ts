import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Bbox } from './geometry';
import type { PageLines } from './chunk';
import { buildLines } from './lines';

/** The subset of a pdf.js text item the pipeline reads. */
interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const isRawTextItem = (item: unknown): item is RawTextItem =>
  typeof item === 'object' && item !== null && 'str' in item && 'transform' in item;

/**
 * Extracts every page's text as reading order lines, each with its bounding
 * box in PDF user space. The transform matrix's last two entries are the
 * fragment's baseline origin.
 */
export const extractPages = async (data: Uint8Array): Promise<PageLines[]> => {
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const pages: PageLines[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const fragments = (content.items as unknown[]).filter(isRawTextItem).map(item => ({
        text: item.str,
        bbox: [item.transform[4], item.transform[5], item.width, item.height] as Bbox,
      }));

      pages.push({ page: pageNumber, lines: buildLines(fragments) });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages;
};
