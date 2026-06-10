import type { Option } from '~/common';
import type {
  LibraryFiltersState,
  LibraryItem,
  LibraryItemType,
  LibrarySortOption,
  LibraryTypeFilter,
} from '~/types/library';

/** Human-readable labels for each library item type. */
export const LIBRARY_TYPE_LABELS: Record<LibraryItemType, string> = {
  pdf: 'PDF',
  image: 'Image',
  video: 'Video',
  document: 'Document',
  code: 'Code',
  spreadsheet: 'Spreadsheet',
  audio: 'Audio',
  artifact: 'Artifact',
};

/** Sort option labels for the sort dropdown. */
export const LIBRARY_SORT_LABELS: Record<LibrarySortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name (A–Z)',
  size: 'Size (largest)',
};

/** All filterable types in display order. */
export const LIBRARY_FILTER_TYPES: LibraryItemType[] = [
  'pdf',
  'image',
  'video',
  'document',
  'code',
  'spreadsheet',
  'audio',
  'artifact',
];

const LIBRARY_TYPE_FILTER_VALUES = new Set<string>(['all', ...LIBRARY_FILTER_TYPES]);
const LIBRARY_SORT_OPTION_VALUES = new Set<string>(Object.keys(LIBRARY_SORT_LABELS));

/** Dropdown options for the type filter control. */
export const LIBRARY_TYPE_FILTER_OPTIONS: Option[] = [
  { value: 'all', label: 'All types' },
  ...LIBRARY_FILTER_TYPES.map((type) => ({
    value: type,
    label: LIBRARY_TYPE_LABELS[type],
  })),
];

/** Dropdown options for the sort control. */
export const LIBRARY_SORT_OPTIONS: Option[] = (
  Object.entries(LIBRARY_SORT_LABELS) as [LibrarySortOption, string][]
).map(([value, label]) => ({ value, label }));

/** Resolves a dropdown value to a valid type filter, falling back to `all`. */
export function parseLibraryTypeFilter(value: string): LibraryTypeFilter {
  return LIBRARY_TYPE_FILTER_VALUES.has(value) ? (value as LibraryTypeFilter) : 'all';
}

/** Resolves a dropdown value to a valid sort option, falling back to `newest`. */
export function parseLibrarySortOption(value: string): LibrarySortOption {
  return LIBRARY_SORT_OPTION_VALUES.has(value) ? (value as LibrarySortOption) : 'newest';
}

/** Finds the matching dropdown option or returns the fallback entry. */
export function findLibraryOption(
  options: Option[],
  value: string,
  fallbackIndex = 0,
): Option {
  return options.find((option) => String(option.value) === value) ?? options[fallbackIndex];
}

/** Formats byte count into a readable string with unit suffix. */
export function formatLibraryFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/** Formats an ISO date string for list display. */
export function formatLibraryDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
}

/** Returns the storage usage percentage, clamped to 0–100. */
export function getStorageUsagePercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((usedBytes / totalBytes) * 100));
}

/** Filters items by case-insensitive search across name and description. */
export function filterLibraryItemsBySearch(items: LibraryItem[], search: string): LibraryItem[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query),
  );
}

/** Filters items by content type. */
export function filterLibraryItemsByType(
  items: LibraryItem[],
  typeFilter: LibraryTypeFilter,
): LibraryItem[] {
  if (typeFilter === 'all') {
    return items;
  }
  return items.filter((item) => item.type === typeFilter);
}

/** Sorts items by the selected sort option. */
export function sortLibraryItems(items: LibraryItem[], sortBy: LibrarySortOption): LibraryItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    case 'size':
      return sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    default:
      return sorted;
  }
}

/** Applies search, type filter, and sort in sequence. */
export function applyLibraryFilters(
  items: LibraryItem[],
  filters: LibraryFiltersState,
): LibraryItem[] {
  const searched = filterLibraryItemsBySearch(items, filters.search);
  const filtered = filterLibraryItemsByType(searched, filters.typeFilter);
  return sortLibraryItems(filtered, filters.sortBy);
}