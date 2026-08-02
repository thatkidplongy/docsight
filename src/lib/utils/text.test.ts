import { describe, expect, it } from 'vitest';
import { normalizeWhitespace } from './text';

describe('normalizeWhitespace', () => {
  it('collapses runs of spaces, tabs and newlines to single spaces', () => {
    expect(normalizeWhitespace('R&D  expense:\n\t$31.4  billion')).toBe('R&D expense: $31.4 billion');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  total revenue  ')).toBe('total revenue');
  });

  it('returns an empty string for whitespace only input', () => {
    expect(normalizeWhitespace(' \n\t ')).toBe('');
  });
});
