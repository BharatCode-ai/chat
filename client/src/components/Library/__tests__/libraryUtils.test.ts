import { mockLibraryItems } from '~/data/mockLibraryData';
import {
  applyLibraryFilters,
  filterLibraryItemsBySearch,
  filterLibraryItemsByType,
  findLibraryOption,
  formatLibraryFileSize,
  getStorageUsagePercent,
  LIBRARY_SORT_OPTIONS,
  LIBRARY_TYPE_FILTER_OPTIONS,
  parseLibrarySortOption,
  parseLibraryTypeFilter,
  sortLibraryItems,
} from '../libraryUtils';

describe('libraryUtils', () => {
  describe('formatLibraryFileSize', () => {
    it('formats bytes', () => {
      expect(formatLibraryFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatLibraryFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatLibraryFileSize(2_621_440)).toBe('2.5 MB');
    });
  });

  describe('getStorageUsagePercent', () => {
    it('calculates percentage', () => {
      expect(getStorageUsagePercent(50, 100)).toBe(50);
    });

    it('clamps to 100', () => {
      expect(getStorageUsagePercent(150, 100)).toBe(100);
    });
  });

  describe('filterLibraryItemsBySearch', () => {
    it('returns all items for empty search', () => {
      expect(filterLibraryItemsBySearch(mockLibraryItems, '')).toHaveLength(mockLibraryItems.length);
    });

    it('filters by name case-insensitively', () => {
      const results = filterLibraryItemsBySearch(mockLibraryItems, 'pdf');
      expect(results.every((item) => item.name.toLowerCase().includes('pdf') || item.description?.toLowerCase().includes('pdf'))).toBe(true);
    });
  });

  describe('filterLibraryItemsByType', () => {
    it('returns all items for "all" filter', () => {
      expect(filterLibraryItemsByType(mockLibraryItems, 'all')).toHaveLength(mockLibraryItems.length);
    });

    it('filters by type', () => {
      const results = filterLibraryItemsByType(mockLibraryItems, 'image');
      expect(results.every((item) => item.type === 'image')).toBe(true);
    });
  });

  describe('sortLibraryItems', () => {
    it('sorts by newest first', () => {
      const sorted = sortLibraryItems(mockLibraryItems, 'newest');
      expect(new Date(sorted[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(sorted[1].createdAt).getTime(),
      );
    });

    it('sorts by name', () => {
      const sorted = sortLibraryItems(mockLibraryItems, 'name');
      expect(sorted[0].name.localeCompare(sorted[1].name)).toBeLessThanOrEqual(0);
    });

    it('sorts by size descending', () => {
      const sorted = sortLibraryItems(mockLibraryItems, 'size');
      expect(sorted[0].sizeBytes).toBeGreaterThanOrEqual(sorted[1].sizeBytes);
    });
  });

  describe('applyLibraryFilters', () => {
    it('combines search, type filter, and sort', () => {
      const results = applyLibraryFilters(mockLibraryItems, {
        search: 'api',
        typeFilter: 'code',
        sortBy: 'name',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('api-client.ts');
    });
  });

  describe('parseLibraryTypeFilter', () => {
    it('returns valid type filters unchanged', () => {
      expect(parseLibraryTypeFilter('pdf')).toBe('pdf');
      expect(parseLibraryTypeFilter('all')).toBe('all');
    });

    it('falls back to all for invalid values', () => {
      expect(parseLibraryTypeFilter('invalid')).toBe('all');
    });
  });

  describe('parseLibrarySortOption', () => {
    it('returns valid sort options unchanged', () => {
      expect(parseLibrarySortOption('name')).toBe('name');
      expect(parseLibrarySortOption('newest')).toBe('newest');
    });

    it('falls back to newest for invalid values', () => {
      expect(parseLibrarySortOption('invalid')).toBe('newest');
    });
  });

  describe('findLibraryOption', () => {
    it('finds matching option by value', () => {
      expect(findLibraryOption(LIBRARY_TYPE_FILTER_OPTIONS, 'pdf').label).toBe('PDF');
    });

    it('returns fallback option when value is missing', () => {
      expect(findLibraryOption(LIBRARY_SORT_OPTIONS, 'missing').value).toBe('newest');
    });
  });
});