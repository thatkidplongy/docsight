/** A passage of extracted PDF text that remembers exactly where it came from. */
export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  /** 1-indexed page number in the source PDF. */
  page: number;
  /** Bounding box in PDF user space units: [x, y, width, height]. */
  bbox: [number, number, number, number];
}

/**
 * A literal span the model claims to have grounded a statement on. Verification
 * checks the quote exists in its source chunk; only then does it earn a page
 * and bounding box for the viewer to highlight.
 */
export interface SpanCitation {
  quote: string;
  chunkId: string;
  verified: boolean;
  page?: number;
  bbox?: [number, number, number, number];
}

/** Each signal is 0 to 1. Overall is the composed score shown to the user. */
export interface ConfidenceBreakdown {
  retrieval: number;
  spanVerification: number;
  selfConsistency: number;
  overall: number;
}

export interface Answer {
  question: string;
  text: string;
  citations: SpanCitation[];
  confidence: ConfidenceBreakdown;
  model: string;
  /** True when the model correctly declined because the source does not contain the answer. */
  refused: boolean;
}

/** One ingested document as listed in public/data/index/manifest.json. */
export interface ManifestEntry {
  id: string;
  ticker: string;
  company: string;
  form: string;
  filingDate: string;
  pages: number;
  chunkCount: number;
}
