import type { LocalizeFunction, Option } from '~/common';
import type {
  LibraryFiltersState,
  LibraryItem,
  LibraryItemType,
  LibrarySortOption,
  LibraryTypeFilter,
} from '~/types/library';
import type { TranslationKeys } from '~/hooks/useLocalize';

/** Translation keys for each library item type. */
export const LIBRARY_TYPE_LABEL_KEYS: Record<LibraryItemType, TranslationKeys> = {
  pdf: 'com_ui_library_pdf',
  image: 'com_ui_library_image',
  video: 'com_ui_library_video',
  document: 'com_ui_library_document',
  code: 'com_ui_code',
  spreadsheet: 'com_ui_library_spreadsheet',
  audio: 'com_ui_library_audio',
  artifact: 'com_ui_library_artifact',
};

/** Translation keys for the sort dropdown. */
export const LIBRARY_SORT_LABEL_KEYS: Record<LibrarySortOption, TranslationKeys> = {
  newest: 'com_ui_library_newest_first',
  oldest: 'com_ui_library_oldest_first',
  name: 'com_ui_library_name_az',
  size: 'com_ui_library_size_largest',
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
const LIBRARY_SORT_OPTION_VALUES = new Set<string>(Object.keys(LIBRARY_SORT_LABEL_KEYS));

export function getLibraryTypeLabel(type: LibraryItemType, localize: LocalizeFunction): string {
  return localize(LIBRARY_TYPE_LABEL_KEYS[type]);
}

/** Builds localized dropdown options for the type filter control. */
export function createLibraryTypeFilterOptions(localize: LocalizeFunction): Option[] {
  return [
    { value: 'all', label: localize('com_ui_library_all_types') },
    ...LIBRARY_FILTER_TYPES.map((type) => ({
      value: type,
      label: getLibraryTypeLabel(type, localize),
    })),
  ];
}

/** Builds localized dropdown options for the sort control. */
export function createLibrarySortOptions(localize: LocalizeFunction): Option[] {
  return (Object.entries(LIBRARY_SORT_LABEL_KEYS) as [LibrarySortOption, TranslationKeys][]).map(
    ([value, labelKey]) => ({ value, label: localize(labelKey) }),
  );
}

/** Resolves a dropdown value to a valid type filter, falling back to `all`. */
export function parseLibraryTypeFilter(value: string): LibraryTypeFilter {
  return LIBRARY_TYPE_FILTER_VALUES.has(value) ? (value as LibraryTypeFilter) : 'all';
}

/** Resolves a dropdown value to a valid sort option, falling back to `newest`. */
export function parseLibrarySortOption(value: string): LibrarySortOption {
  return LIBRARY_SORT_OPTION_VALUES.has(value) ? (value as LibrarySortOption) : 'newest';
}

/** Finds the matching dropdown option or returns the fallback entry. */
export function findLibraryOption(options: Option[], value: string, fallbackIndex = 0): Option {
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
  return Math.max(0, Math.min(100, Math.round((usedBytes / totalBytes) * 100)));
}

/** Filters items by case-insensitive search across name and description. */
export function filterLibraryItemsBySearch(items: LibraryItem[], search: string): LibraryItem[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query),
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
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
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
