import type { ManifestEntry } from '../types';
import { INDEX_URL, MANIFEST_FILENAME } from '../retrieval/index-files';
import { useJsonResource, type JsonResource } from './useJsonResource';

export const useManifest = (): JsonResource<ManifestEntry[]> =>
  useJsonResource<ManifestEntry[]>(`${INDEX_URL}/${MANIFEST_FILENAME}`);
