import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Search } from 'lucide-react';
import { CrossIcon } from '@librechat/client';
import { Input, SelectDropDown } from '@librechat/client';
import type { LibraryFiltersState, LibraryViewMode } from '~/types/library';
import { useDebounce } from '~/hooks';
import { createDropdownSetter } from '~/utils';
import {
  findLibraryOption,
  LIBRARY_SORT_OPTIONS,
  LIBRARY_TYPE_FILTER_OPTIONS,
  parseLibrarySortOption,
  parseLibraryTypeFilter,
} from './libraryUtils';
import LibraryViewToggle from './LibraryViewToggle';

interface LibraryFiltersProps {
  filters: LibraryFiltersState;
  onFiltersChange: Dispatch<SetStateAction<LibraryFiltersState>>;
  resultCount: number;
  totalCount: number;
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
}

export default function LibraryFilters({
  filters,
  onFiltersChange,
  resultCount,
  totalCount,
  viewMode,
  onViewModeChange,
}: LibraryFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (debouncedSearch !== filters.search && debouncedSearch === searchInput) {
      onFiltersChange((prev) => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch, filters.search, onFiltersChange, searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    onFiltersChange((prev) => ({ ...prev, search: '' }));
  }, [onFiltersChange]);

  const selectedTypeOption = findLibraryOption(LIBRARY_TYPE_FILTER_OPTIONS, filters.typeFilter);

  const selectedSortOption = findLibraryOption(LIBRARY_SORT_OPTIONS, filters.sortBy);

  const handleTypeChange = useMemo(
    () =>
      createDropdownSetter((value) => {
        const typeFilter = parseLibraryTypeFilter(value);
        onFiltersChange((prev) =>
          prev.typeFilter === typeFilter ? prev : { ...prev, typeFilter },
        );
      }),
    [onFiltersChange],
  );

  const handleSortChange = useMemo(
    () =>
      createDropdownSetter((value) => {
        const sortBy = parseLibrarySortOption(value);
        onFiltersChange((prev) => (prev.sortBy === sortBy ? prev : { ...prev, sortBy }));
      }),
    [onFiltersChange],
  );

  const itemLabel = totalCount === 1 ? 'item' : 'items';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1" role="search">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <label htmlFor="library-search" className="sr-only">
            Search library
          </label>
          <Input
            id="library-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search files and artifacts..."
            className="h-10 rounded-lg border-border-medium bg-transparent pl-10 pr-10 text-sm text-text-primary placeholder:text-text-secondary focus:ring-0"
            aria-label="Search library"
            autoComplete="off"
            spellCheck={false}
          />
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <CrossIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="group" aria-label="Filter by type">
            <SelectDropDown
              title="Filter by type"
              value={selectedTypeOption}
              setValue={handleTypeChange}
              availableValues={LIBRARY_TYPE_FILTER_OPTIONS}
              showAbove={false}
              showLabel={false}
              className="h-10 min-w-[9rem] rounded-lg text-sm"
            />
          </div>
          <div role="group" aria-label="Sort library items">
            <SelectDropDown
              title="Sort library items"
              value={selectedSortOption}
              setValue={handleSortChange}
              availableValues={LIBRARY_SORT_OPTIONS}
              showAbove={false}
              showLabel={false}
              className="h-10 min-w-[9rem] rounded-lg text-sm"
            />
          </div>
          <LibraryViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
      </div>

      {/* eslint-disable i18next/no-literal-string */}
      <p className="text-xs text-text-secondary" aria-live="polite">
        Showing {resultCount} of {totalCount} {itemLabel}
      </p>
      {/* eslint-enable i18next/no-literal-string */}
    </div>
  );
}
