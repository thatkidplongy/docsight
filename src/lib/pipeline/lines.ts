import type { Bbox } from './geometry';
import { unionBboxes } from './geometry';
import { normalizeWhitespace } from '../utils/text';

/** A positioned fragment of text as pdf.js extracts it: often less than a word. */
export interface PositionedText {
  text: string;
  bbox: Bbox;
}

export interface Line {
  text: string;
  bbox: Bbox;
}

/** Fragments whose baselines differ by no more than this sit on the same line. */
const Y_TOLERANCE = 2.5;

/**
 * Horizontal gap between fragments (in PDF units) below which they are joined
 * without a space. PDF text is split arbitrarily mid word, so "R" + "&D" must
 * rejoin as "R&D", while genuinely separate words keep their space.
 */
const WORD_GAP = 1.0;

const joinFragments = (fragments: PositionedText[]): string => {
  let text = '';
  let previousEnd: number | null = null;

  for (const fragment of fragments) {
    const gap = previousEnd === null ? 0 : fragment.bbox[0] - previousEnd;

    if (previousEnd !== null && gap > WORD_GAP) {
      text += ' ';
    }

    text += fragment.text;
    previousEnd = fragment.bbox[0] + fragment.bbox[2];
  }

  return normalizeWhitespace(text);
};

/**
 * Groups raw pdf.js fragments into reading order lines. PDF y grows upward,
 * so sorting by descending y walks the page top to bottom.
 */
export const buildLines = (fragments: PositionedText[]): Line[] => {
  const visible = fragments.filter(fragment => fragment.text.trim().length > 0);

  if (visible.length === 0) return [];

  // filter() already returned a fresh array, so sorting in place copies nothing.
  const sorted = visible.sort((a, b) => b.bbox[1] - a.bbox[1] || a.bbox[0] - b.bbox[0]);
  const groups: PositionedText[][] = [];

  for (const fragment of sorted) {
    const current = groups[groups.length - 1];
    const sameLine = current && Math.abs(current[0].bbox[1] - fragment.bbox[1]) <= Y_TOLERANCE;

    if (sameLine) current.push(fragment);
    else groups.push([fragment]);
  }

  return groups
    .map(group => {
      const ordered = group.sort((a, b) => a.bbox[0] - b.bbox[0]);

      return {
        text: joinFragments(ordered),
        bbox: unionBboxes(ordered.map(fragment => fragment.bbox)),
      };
    })
    .filter(line => line.text.length > 0);
};
