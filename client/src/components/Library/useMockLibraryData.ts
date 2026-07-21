import { useCallback, useEffect, useState } from 'react';
import { mockLibraryResponse } from '~/data/mockLibraryData';
import { useLocalize } from '~/hooks';
import type { LibraryItem, LibraryListStatus, LibraryStorageInfo } from '~/types/library';

const MOCK_LOAD_DELAY_MS = 800;

export type MockLibraryScenario = 'success' | 'empty' | 'error';

interface UseMockLibraryDataOptions {
  /** Simulated network scenario. Defaults to `success`. */
  scenario?: MockLibraryScenario;
  /** Artificial delay before resolving mock data (ms). */
  delayMs?: number;
  /** When true, fetches on mount. Defaults to true. */
  autoFetch?: boolean;
}

interface UseMockLibraryDataResult {
  items: LibraryItem[];
  storage: LibraryStorageInfo | null;
  status: LibraryListStatus;
  errorMessage: string | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Simulates an async library API call with mocked data.
 * Useful for development and Storybook-style previews before the real API exists.
 */
export function useMockLibraryData(
  options: UseMockLibraryDataOptions = {},
): UseMockLibraryDataResult {
  const localize = useLocalize();
  const { scenario = 'success', delayMs = MOCK_LOAD_DELAY_MS, autoFetch = true } = options;

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [storage, setStorage] = useState<LibraryStorageInfo | null>(null);
  const [status, setStatus] = useState<LibraryListStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      setErrorMessage(null);

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      if (cancelled) {
        return;
      }

      if (scenario === 'error') {
        setItems([]);
        setStorage(null);
        setStatus('error');
        setErrorMessage(localize('com_ui_library_error_service'));
        return;
      }

      if (scenario === 'empty') {
        setItems([]);
        setStorage(mockLibraryResponse.storage);
        setStatus('empty');
        return;
      }

      const response = mockLibraryResponse;
      setItems(response.items);
      setStorage(response.storage);
      setStatus(response.items.length > 0 ? 'populated' : 'empty');
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [autoFetch, delayMs, scenario, fetchKey, localize]);

  return {
    items,
    storage,
    status,
    errorMessage,
    isLoading: status === 'loading',
    refetch,
  };
}
