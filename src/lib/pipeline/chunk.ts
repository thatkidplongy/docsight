import type { Chunk } from '../types';
import { unionBboxes } from './geometry';
import type { Line } from './lines';

export interface PageLines {
  page: number;
  lines: Line[];
}

/**
 * Chunks aim for this many characters. Small enough that a retrieved chunk is
 * a focused passage, large enough to carry a full disclosure sentence with its
 * surrounding context.
 */
const TARGET_CHUNK_CHARS = 1000;

/**
 * Cuts each page's lines into consecutive, non overlapping chunks. Chunks
 * never cross a page boundary, and every chunk's bbox is the union of its
 * lines, so provenance survives from extraction to render.
 */
export const buildChunks = (documentId: string, pages: PageLines[]): Chunk[] => {
  const chunks: Chunk[] = [];

  const flush = (page: number, buffer: Line[]): void => {
    if (buffer.length === 0) return;

    const text = buffer
      .map(line => line.text)
      .join(' ')
      .trim();

    if (text.length === 0) return;

    chunks.push({
      id: `${documentId}-${chunks.length}`,
      documentId,
      text,
      page,
      bbox: unionBboxes(buffer.map(line => line.bbox)),
    });
  };

  for (const { page, lines } of pages) {
    let buffer: Line[] = [];
    let bufferedChars = 0;

    for (const line of lines) {
      buffer.push(line);
      bufferedChars += line.text.length;

      if (bufferedChars >= TARGET_CHUNK_CHARS) {
        flush(page, buffer);
        buffer = [];
        bufferedChars = 0;
      }
    }

    flush(page, buffer);
  }

  return chunks;
};
