import { useEffect, useState } from 'react';

export type ResourceStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface JsonResource<T> {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
}

const LOADING: JsonResource<never> = { data: null, status: 'loading', error: null };

/**
 * Fetches and parses one JSON document, distinguishing a 404 ("missing", an
 * expected state for artifacts a pipeline has not generated yet) from a real
 * failure. Pass a null url to stay idle until the caller knows what to load.
 */
export const useJsonResource = <T>(url: string | null): JsonResource<T> => {
  const [resource, setResource] = useState<JsonResource<T>>(LOADING);

  useEffect(() => {
    if (!url) {
      setResource(LOADING);
      return;
    }

    const controller = new AbortController();
    setResource(LOADING);

    const fetchResource = async (): Promise<void> => {
      try {
        const response = await fetch(url, { signal: controller.signal });

        if (response.status === 404) {
          setResource({ data: null, status: 'missing', error: null });
          return;
        }

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        setResource({ data: (await response.json()) as T, status: 'ready', error: null });
      } catch (error) {
        if (controller.signal.aborted) return;

        setResource({
          data: null,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void fetchResource();

    return () => controller.abort();
  }, [url]);

  return resource;
};
