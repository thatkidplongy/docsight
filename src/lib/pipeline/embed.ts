import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

/**
 * Small enough to download once and run anywhere (Node during ingest, the
 * browser for live queries), good enough for passage retrieval.
 */
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

export const EMBEDDING_DIMS = 384;

const BATCH_SIZE = 32;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

const loadExtractor = (): Promise<FeatureExtractionPipeline> => {
  extractorPromise ??= pipeline('feature-extraction', MODEL_ID);
  return extractorPromise;
};

/**
 * Embeds texts into one concatenated Float32Array of shape
 * [texts.length, EMBEDDING_DIMS], mean pooled and L2 normalised so cosine
 * similarity reduces to a dot product.
 */
export const embedTexts = async (
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Float32Array> => {
  const extractor = await loadExtractor();
  const embeddings = new Float32Array(texts.length * EMBEDDING_DIMS);

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const output = await extractor(batch, { pooling: 'mean', normalize: true });
    const values = output.data as Float32Array;

    embeddings.set(values, start * EMBEDDING_DIMS);
    output.dispose();
    onProgress?.(Math.min(start + BATCH_SIZE, texts.length), texts.length);
  }

  return embeddings;
};
