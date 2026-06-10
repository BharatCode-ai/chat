import LibraryList from './LibraryList';
import { useMockLibraryData, type MockLibraryScenario } from './useMockLibraryData';

interface LibraryListWithMockDataProps {
  scenario?: MockLibraryScenario;
  className?: string;
}

/**
 * Convenience wrapper that wires LibraryList to the mock data hook.
 * Drop-in component for development until the real API is integrated.
 */
export default function LibraryListWithMockData({
  scenario = 'success',
  className,
}: LibraryListWithMockDataProps) {
  const { items, storage, status, errorMessage, refetch } = useMockLibraryData({ scenario });

  return (
    <LibraryList
      items={items}
      status={status}
      storage={storage}
      errorMessage={errorMessage ?? undefined}
      onRetry={refetch}
      className={className}
    />
  );
}