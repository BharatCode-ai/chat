/** Supported library item content types for filtering. */
export type LibraryItemType =
  | 'pdf'
  | 'image'
  | 'video'
  | 'document'
  | 'code'
  | 'spreadsheet'
  | 'audio'
  | 'artifact';

/** Distinguishes uploaded files from generated artifacts. */
export type LibraryItemKind = 'file' | 'artifact';

/** Available sort options for the library list. */
export type LibrarySortOption = 'newest' | 'oldest' | 'name' | 'size';

/** View modes for the library artifact list. */
export type LibraryViewMode = 'dense' | 'preview';

/** UI state for the library list container. */
export type LibraryListStatus = 'loading' | 'empty' | 'populated' | 'error';

/** Type filter value — `all` shows every item. */
export type LibraryTypeFilter = LibraryItemType | 'all';

export interface LibraryItem {
  id: string;
  name: string;
  type: LibraryItemType;
  kind: LibraryItemKind;
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  conversationId?: string;
  mimeType?: string;
}

export interface LibraryStorageInfo {
  usedBytes: number;
  totalBytes: number;
}

export interface LibraryFiltersState {
  search: string;
  typeFilter: LibraryTypeFilter;
  sortBy: LibrarySortOption;
}

export interface LibraryViewState {
  viewMode: LibraryViewMode;
}

export interface LibraryListResponse {
  items: LibraryItem[];
  storage: LibraryStorageInfo | null;
}