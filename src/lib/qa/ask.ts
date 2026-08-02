import type { Answer } from '../types';
import type { Provider } from '../providers/provider';
import { searchIndex, type DocumentIndex } from '../retrieval/search';
import { computeTokenJaccard } from '../utils/text';
import { ANSWER_JSON_SCHEMA, buildAnswerMessages } from './prompt';
import { parseModelAnswer } from './parse';
import { verifySpans } from './verify';
import { composeConfidence } from './confidence';

export interface AskDependencies {
  provider: Provider;
  embedQuery: (text: string) => Promise<Float32Array>;
}

export interface AskOptions {
  topK?: number;
  /** Extra sampled answers for the self consistency signal; 0 skips it. */
  consistencySamples?: number;
}

/** Two answers agree when their token overlap clears this Jaccard threshold. */
const AGREEMENT_THRESHOLD = 0.5;

const SAMPLE_TEMPERATURE = 0.8;

const measureConsistency = async (
  provider: Provider,
  messages: ReturnType<typeof buildAnswerMessages>,
  primaryAnswer: string,
  samples: number
): Promise<number | undefined> => {
  const sampledAnswers: string[] = [];

  for (let i = 0; i < samples; i++) {
    try {
      const result = await provider.complete({
        messages,
        temperature: SAMPLE_TEMPERATURE,
        jsonSchema: ANSWER_JSON_SCHEMA,
      });
      sampledAnswers.push(parseModelAnswer(result.text).answer);
    } catch {
      // An unparseable sample counts as disagreement rather than aborting the answer.
      sampledAnswers.push('');
    }
  }

  if (sampledAnswers.length === 0) return undefined;

  const agreements = sampledAnswers.filter(
    sample => computeTokenJaccard(sample, primaryAnswer) >= AGREEMENT_THRESHOLD
  ).length;

  return agreements / sampledAnswers.length;
};

export const askQuestion = async (
  deps: AskDependencies,
  index: DocumentIndex,
  question: string,
  options: AskOptions = {}
): Promise<Answer> => {
  const queryEmbedding = await deps.embedQuery(question);
  const retrieved = searchIndex(index, queryEmbedding, question, options.topK);

  if (retrieved.length === 0) {
    throw new Error('Retrieval returned no passages; is the document index empty?');
  }

  const messages = buildAnswerMessages(question, retrieved);
  const primary = parseModelAnswer(
    (await deps.provider.complete({ messages, temperature: 0, jsonSchema: ANSWER_JSON_SCHEMA })).text
  );

  const citations = verifySpans(
    retrieved.map(result => result.chunk),
    primary.spans
  );

  const consistencySamples = options.consistencySamples ?? 0;
  const selfConsistency =
    consistencySamples > 0 && !primary.refused
      ? await measureConsistency(deps.provider, messages, primary.answer, consistencySamples)
      : undefined;

  return {
    question,
    text: primary.answer,
    citations,
    confidence: composeConfidence({
      topDenseScore: retrieved[0].denseScore,
      citations,
      selfConsistency,
    }),
    model: deps.provider.name,
    refused: primary.refused,
  };
};
