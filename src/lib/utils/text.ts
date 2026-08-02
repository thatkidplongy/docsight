/**
 * Collapses whitespace runs to single spaces and trims. PDF extraction produces
 * inconsistent spacing (line wraps, column gaps, ligatures), so span matching
 * must always compare normalised text, never raw extraction output.
 */
export const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();
