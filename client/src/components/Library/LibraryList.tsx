import { useCallback, useMemo, useState } from 'react';
import type {
  LibraryFiltersState,
  LibraryItem,
  LibraryListStatus,
  LibraryStorageInfo,
  LibraryViewMode,
} from '~/types/library';
import { useLocalize } from '~/hooks';
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
  onDownload?: (item: LibraryItem) => void;
  onShare?: (item: LibraryItem) => void;
  onMore?: (item: LibraryItem) => void;
  className?: string;
}

export default function LibraryList({
  items,
  status,
  storage = null,
  errorMessage,
  onRetry,
  onItemClick,
  onDownload,
  onShare,
  onMore,
  className = '',
}: LibraryListProps) {
  const localize = useLocalize();
  const [filters, setFilters] = useState<LibraryFiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<LibraryViewMode>('dense');

  const filteredItems = useMemo(
    () => (status === 'populated' ? applyLibraryFilters(items, filters) : []),
    [items, filters, status],
  );

  const isFiltered = filters.search.trim().length > 0 || filters.typeFilter !== 'all';

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

  let listContent: React.ReactNode;
  if (filteredItems.length === 0) {
    listContent = <LibraryEmptyState isFiltered={isFiltered} onClearFilters={handleClearFilters} />;
  } else if (viewMode === 'preview') {
    listContent = (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label={localize('com_ui_library_items')}
      >
        {filteredItems.map((item) => (
          <LibraryPreviewCard
            key={item.id}
            item={item}
            onClick={onItemClick}
            onDownload={onDownload}
            onShare={onShare}
            onMore={onMore}
          />
        ))}
      </div>
    );
  } else {
    listContent = (
      <div
        className="flex flex-col gap-2"
        role="list"
        aria-label={localize('com_ui_library_items')}
      >
        {filteredItems.map((item) => (
          <LibraryListItem
            key={item.id}
            item={item}
            onClick={onItemClick}
            onDownload={onDownload}
            onShare={onShare}
            onMore={onMore}
          />
        ))}
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

      {listContent}
    </div>
  );
}
