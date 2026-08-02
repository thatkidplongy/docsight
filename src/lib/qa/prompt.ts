import type { ChatMessage } from '../providers/provider';
import type { RetrievedChunk } from '../retrieval/search';

export interface RawSpan {
  chunkId: string;
  quote: string;
}

export interface RawModelAnswer {
  answer: string;
  refused: boolean;
  spans: RawSpan[];
}

export const ANSWER_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    refused: { type: 'boolean' },
    spans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chunkId: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['chunkId', 'quote'],
      },
    },
  },
  required: ['answer', 'refused', 'spans'],
};

const SYSTEM_PROMPT = `You answer questions about an SEC filing using ONLY the numbered passages provided.

Rules:
- Base every factual claim on the passages. Never use outside knowledge.
- For each claim, add a span: the chunkId of the passage plus a quote copied VERBATIM from it (3 to 40 words). Do not paraphrase, reformat numbers, or fix typos inside a quote.
- If the passages do not contain the answer, set refused to true, say briefly what is missing in answer, and return an empty spans array.
- Keep the answer concise and include the specific figures when the question asks for numbers.

Respond with JSON only: {"answer": string, "refused": boolean, "spans": [{"chunkId": string, "quote": string}]}`;

export const buildAnswerMessages = (question: string, retrieved: RetrievedChunk[]): ChatMessage[] => {
  const passages = retrieved
    .map(result => `[${result.chunk.id}] (page ${result.chunk.page})\n${result.chunk.text}`)
    .join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Passages:\n\n${passages}\n\nQuestion: ${question}` },
  ];
};
