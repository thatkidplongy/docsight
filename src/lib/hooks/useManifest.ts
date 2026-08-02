import { useEffect, useState } from 'react';
import type { ManifestEntry } from '../types';

interface ManifestState {
  manifest: ManifestEntry[] | null;
  error: string | null;
}

export const useManifest = (): ManifestState => {
  const [state, setState] = useState<ManifestState>({ manifest: null, error: null });

  useEffect(() => {
    let cancelled = false;

    const fetchManifest = async (): Promise<void> => {
      try {
        const response = await fetch('/data/index/manifest.json');

        if (!response.ok) throw new Error(`manifest fetch failed: ${response.status}`);

        const manifest = (await response.json()) as ManifestEntry[];

        if (!cancelled) setState({ manifest, error: null });
      } catch (error) {
        if (!cancelled) setState({ manifest: null, error: error instanceof Error ? error.message : String(error) });
      }
    };

    void fetchManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
