/**
 * RFC 0001: File and Artifact Platform
 * StorageDriver interface and related types.
 *
 * These interfaces define the contract for storage backends.
 * Implementations include LocalDiskStorageDriver and GcsStorageDriver.
 * An InMemoryFakeStorageDriver is provided for unit testing.
 */

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * Stable error codes for StorageDriver operations.
 * Consumers can switch on these codes without parsing messages.
 */
export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INVALID_OBJECT_NAME'
  | 'PATH_TRAVERSAL'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_MIME_TYPE'
  | 'DRIVER_NOT_READY'
  | 'DELETE_IN_PROGRESS'
  | 'UNKNOWN';

export interface StorageErrorOptions {
  code: StorageErrorCode;
  message: string;
  objectName?: string;
  fileId?: string;
  userId?: string;
}

/**
 * Structured error thrown by StorageDriver operations.
 * Designed to be serialised into API error responses.
 */
export class StorageError extends Error {
  code: StorageErrorCode;
  objectName?: string;
  fileId?: string;
  userId?: string;

  constructor({ code, message, objectName, fileId, userId }: StorageErrorOptions) {
    super(`${code}: ${message}`);
    this.name = 'StorageError';
    this.code = code;
    this.objectName = objectName;
    this.fileId = fileId;
    this.userId = userId;
  }
}

// ─── Result / Handle Types ───────────────────────────────────────────────────

/**
 * Handle returned after a successful write.
 * Consumers use fileId / objectName for subsequent read/metadata/delete calls.
 */
export interface StorageHandle {
  fileId: string;
  objectName: string;
  userId: string;
  mimeType: string;
  sizeBytes: number;
  /** ISO-8601 timestamp of creation */
  createdAt: string;
}

/**
 * Metadata snapshot for a stored object.
 * Returned by getMetadata and listed by listFiles.
 */
export interface FileMetadata {
  fileId: string;
  objectName: string;
  userId: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  /** ISO-8601 timestamp of last modification (may equal createdAt) */
  updatedAt: string;
  /** SHA-256 hex digest of the stored bytes (nullable when unavailable) */
  hash?: string | null;
}

/**
 * Result of a successful copy operation.
 */
export interface CopyResult {
  handle: StorageHandle;
  /** True when the source and destination handle point to the same underlying object */
  isSameObject: boolean;
}

/**
 * Version record for a file.
 * Each call to write with the same fileId creates a new version.
 */
export interface VersionInfo {
  versionId: string;
  fileId: string;
  objectName: string;
  userId: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  /** Whether this version is the current (latest) one */
  isCurrent: boolean;
}

// ─── Read / Stream Types ─────────────────────────────────────────────────────

/**
 * Options passed to read() for partial fetches.
 */
export interface ReadOptions {
  /** Zero-based byte offset. Defaults to 0 (start of file). */
  offset?: number;
  /** Number of bytes to read. Defaults to entire file. */
  limit?: number;
}

/**
 * Return type for read() — the bytes plus metadata about what was returned.
 */
export interface ReadResult {
  buffer: Buffer;
  metadata: FileMetadata;
}

// ─── List / Query Types ──────────────────────────────────────────────────────

/**
 * Filters for listFiles().
 */
export interface ListFilesFilter {
  userId?: string;
  mimeTypePrefix?: string;
  /** Return only versions up to and including this timestamp */
  createdAtBefore?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Paginated list result.
 */
export interface ListFilesResult {
  items: FileMetadata[];
  /** Whether more items are available beyond this page */
  hasMore: boolean;
}

// ─── Driver Interface ────────────────────────────────────────────────────────

/**
 * Core storage driver contract for the File and Artifact Platform (RFC 0001).
 *
 * Every method is async and returns a Promise so that in-memory, local-disk,
 * and GCS implementations share the same call signature.
 *
 * Implementations:
 *  - LocalDiskStorageDriver  (contributor / local dev)
 *  - GcsStorageDriver        (maintainer / production)
 *  - InMemoryFakeStorageDriver (unit tests)
 */
export interface StorageDriver {
  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialise the driver. Called once before any storage operation.
   * Implementations may validate configuration, create directories, etc.
   */
  initialize(): Promise<void>;

  /**
   * Tear down the driver and release any resources.
   */
  destroy(): Promise<void>;

  // ── Write ────────────────────────────────────────────────────────────────

  /**
   * Store bytes under the given object name for the given user.
   *
   * @param userId  - Owning user identifier.
   * @param objectName - Logical object name (path-like, must be sanitised by caller).
   * @param buffer - Raw bytes to persist.
   * @param mimeType - Declared MIME type of the content.
   * @param fileId - Optional stable file identifier; auto-generated when omitted.
   * @returns Handle referencing the newly stored object.
   */
  write(
    userId: string,
    objectName: string,
    buffer: Buffer,
    mimeType: string,
    fileId?: string,
  ): Promise<StorageHandle>;

  // ── Read ─────────────────────────────────────────────────────────────────

  /**
   * Retrieve stored bytes by fileId + objectName.
   *
   * @throws StorageError with code 'NOT_FOUND' when the object does not exist.
   */
  read(fileId: string, objectName: string, options?: ReadOptions): Promise<ReadResult>;

  // ── Metadata ─────────────────────────────────────────────────────────────

  /**
   * Return metadata for a stored object.
   *
   * @throws StorageError with code 'NOT_FOUND' when the object does not exist.
   */
  getMetadata(fileId: string, objectName: string): Promise<FileMetadata>;

  // ── List ─────────────────────────────────────────────────────────────────

  /**
   * List files matching the given filter.
   */
  listFiles(filter?: ListFilesFilter): Promise<ListFilesResult>;

  // ── Delete ───────────────────────────────────────────────────────────────

  /**
   * Delete a stored object.
   *
   * @throws StorageError with code 'NOT_FOUND' when the object does not exist.
   */
  delete(fileId: string, objectName: string): Promise<void>;

  // ── Copy ─────────────────────────────────────────────────────────────────

  /**
   * Copy an existing object to a new object name within the same userId scope.
   *
   * @returns CopyResult describing the new handle.
   */
  copy(
    sourceFileId: string,
    sourceObjectName: string,
    targetObjectName: string,
  ): Promise<CopyResult>;

  // ── Version ──────────────────────────────────────────────────────────────

  /**
   * Return version history for a file, newest first.
   */
  listVersions(fileId: string): Promise<VersionInfo[]>;

  /**
   * Return the current (latest) version info for a file.
   */
  getCurrentVersion(fileId: string): Promise<VersionInfo>;
}
