import type {
  StorageError,
  StorageFileMetadata,
  StorageResult,
  StorageVersionEntry,
} from './types';

/**
 * StorageDriver — minimal, mockable interface for file storage operations.
 *
 * Designed to be backend-agnostic: implementations can target local disk,
 * GCS, S3, or an in-memory store without exposing any provider-specific
 * concepts (buckets, signed URLs, IAM, etc.).
 */
export interface StorageDriver {
  /**
   * Write content to the given path.
   * Creates the entry if it does not exist; overwrites and creates a new
   * version if it does.
   * Errors: INVALID_PATH
   */
  write(path: string, content: Buffer): Promise<StorageResult<{ versionId: string }>>;

  /**
   * Read the content at the given path.
   * Returns NOT_FOUND if the path does not exist.
   * Errors: NOT_FOUND, INVALID_PATH
   */
  read(path: string): Promise<StorageResult<Buffer>>;

  /**
   * Retrieve metadata for the file at the given path.
   * Returns NOT_FOUND if the path does not exist.
   * Errors: NOT_FOUND, INVALID_PATH
   */
  getMetadata(path: string): Promise<StorageResult<StorageFileMetadata>>;

  /**
   * Delete the file at the given path, including all version history.
   * Returns NOT_FOUND if the path does not exist.
   * Errors: NOT_FOUND, INVALID_PATH
   */
  delete(path: string): Promise<StorageResult<void>>;

  /**
   * Copy the file at sourcePath to destPath.
   * Returns NOT_FOUND if the source does not exist.
   * Creates a new version at destPath; prior destPath content is preserved
   * in version history if the destination already existed.
   * Errors: NOT_FOUND (source), INVALID_PATH
   */
  copy(sourcePath: string, destPath: string): Promise<StorageResult<{ versionId: string }>>;

  /**
   * List all stored versions for the file at the given path, ordered
   * oldest-first.
   * Returns NOT_FOUND if the path has never been written.
   * Errors: NOT_FOUND, INVALID_PATH
   */
  listVersions(path: string): Promise<StorageResult<StorageVersionEntry[]>>;
}

export type { StorageError, StorageFileMetadata, StorageResult, StorageVersionEntry };
