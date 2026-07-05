import { useCallback, useMemo, useState } from 'react';
import type {
  LibraryFiltersState,
  LibraryItem,
  LibraryListStatus,
  LibraryStorageInfo,
  LibraryViewMode,
} from '~/types/library';
import LibraryEmptyState from './LibraryEmptyState';
import LibraryErrorState from './LibraryErrorState';
import LibraryFilters from './LibraryFilters';
import LibraryListItem from './LibraryListItem';
import LibraryLoadingState from './LibraryLoadingState';
import LibraryPreviewCard from './LibraryPreviewCard';
import LibraryStorageBar from './LibraryStorageBar';
import { applyLibraryFilters } from './libraryUtils';

const DEFAULT_FILTERS: LibraryFiltersState = {
  search: '',
  typeFilter: 'all',
  sortBy: 'newest',
};

interface LibraryListProps {
  items: LibraryItem[];
  status: LibraryListStatus;
  storage?: LibraryStorageInfo | null;
  errorMessage?: string;
  onRetry?: () => void;
  onItemClick?: (item: LibraryItem) => void;
  className?: string;
}

export default function LibraryList({
  items,
  status,
  storage = null,
  errorMessage,
  onRetry,
  onItemClick,
  className = '',
}: LibraryListProps) {
  const [filters, setFilters] = useState<LibraryFiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<LibraryViewMode>('dense');

  const filteredItems = useMemo(
    () => (status === 'populated' ? applyLibraryFilters(items, filters) : []),
    [items, filters, status],
  );

  const isFiltered =
    filters.search.trim().length > 0 || filters.typeFilter !== 'all';

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  if (status === 'loading') {
    return (
      <div className={className}>
        <LibraryLoadingState />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={className}>
        <LibraryErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className={className}>
        {storage && <LibraryStorageBar storage={storage} />}
        <div className={storage ? 'mt-4' : ''}>
          <LibraryEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {storage && <LibraryStorageBar storage={storage} />}

      <LibraryFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredItems.length}
        totalCount={items.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {filteredItems.length === 0 ? (
        <LibraryEmptyState isFiltered={isFiltered} onClearFilters={handleClearFilters} />
      ) : viewMode === 'preview' ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
          aria-label="Library items"
        >
          {filteredItems.map((item) => (
            <LibraryPreviewCard key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="list" aria-label="Library items">
          {filteredItems.map((item) => (
            <LibraryListItem key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}