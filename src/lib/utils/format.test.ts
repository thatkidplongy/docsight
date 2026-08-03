import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercent } from './format';

describe('formatPercent', () => {
  it('renders a ratio as a whole percent', () => {
    expect(formatPercent(0.871)).toBe('87%');
  });

  it('rounds to nearest rather than truncating', () => {
    expect(formatPercent(0.876)).toBe('88%');
  });

  it('handles the extremes', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDuration', () => {
  it('renders milliseconds as seconds with one decimal', () => {
    expect(formatDuration(177_523)).toBe('177.5s');
  });

  it('keeps sub second durations legible', () => {
    expect(formatDuration(640)).toBe('0.6s');
  });

  it('renders zero', () => {
    expect(formatDuration(0)).toBe('0.0s');
  });
});
