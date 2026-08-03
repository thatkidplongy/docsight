import { describe, expect, it } from 'vitest';
import {
  buildChunksFilename,
  buildDemoFilename,
  buildEmbeddingsFilename,
  buildFilingFilename,
  MANIFEST_FILENAME,
} from './index-files';

describe('index file naming', () => {
  it('derives every artifact name from the document id', () => {
    expect(buildChunksFilename('aapl')).toBe('aapl.chunks.json');
    expect(buildEmbeddingsFilename('aapl')).toBe('aapl.embeddings.bin');
    expect(buildFilingFilename('aapl')).toBe('aapl.pdf');
    expect(buildDemoFilename('aapl')).toBe('aapl.json');
  });

  it('keeps the manifest name document independent', () => {
    expect(MANIFEST_FILENAME).toBe('manifest.json');
  });
});
