import type { DemoFile, DemoItem } from '../types';
import { buildDemoFilename, DEMO_URL } from '../retrieval/index-files';
import { useJsonResource } from './useJsonResource';

/**
 * Precomputed suggested answers are an enhancement, not a requirement: a
 * document without them simply shows no chips, so both missing and failed
 * fetches collapse to an empty list.
 */
export const useDemoItems = (documentId: string | null): DemoItem[] => {
  const { data } = useJsonResource<DemoFile>(documentId ? `${DEMO_URL}/${buildDemoFilename(documentId)}` : null);

  return data?.items ?? [];
};
