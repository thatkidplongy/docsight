/**
 * Collapses whitespace runs to single spaces and trims. PDF extraction produces
 * inconsistent spacing (line wraps, column gaps, ligatures), so span matching
 * must always compare normalised text, never raw extraction output.
 */
export const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Normalisation for comparing model quotes against source text: PDFs use curly
 * quotes, unicode dashes and soft hyphens that a model will reproduce as plain
 * ASCII, so both sides must be folded before matching.
 */
export const normalizeForMatching = (text: string): string =>
  normalizeWhitespace(
    text
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‐-―−]/g, '-')
      .replace(/­/g, '')
  );

export const tokenize = (text: string): string[] =>
  normalizeForMatching(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Jaccard similarity over token sets; 1 when both texts have no tokens. */
export const computeTokenJaccard = (a: string, b: string): number => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  return intersection / (tokensA.size + tokensB.size - intersection);
};
