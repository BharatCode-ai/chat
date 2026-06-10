// ─────────────────────────────────────────────────────────────────────────────
// Result / Error Types
// ─────────────────────────────────────────────────────────────────────────────

/** Discriminated-union result: every driver operation returns one of these. */
export type StorageResult<T> = StorageOk<T> | StorageErr;

export interface StorageOk<T> {
  readonly ok: true;
  readonly value: T;
}

export interface StorageErr {
  readonly ok: false;
  readonly error: StorageError;
}

// ─── Error catalogue ─────────────────────────────────────────────────────────

export type StorageErrorCode =
  | "NOT_FOUND"          // object does not exist
  | "ALREADY_EXISTS"     // write collision when overwrite is disallowed
  | "INVALID_KEY"        // object key failed validation
  | "INVALID_MIME"       // MIME type not accepted
  | "SIZE_EXCEEDED"      // payload exceeds driver limit
  | "COPY_SRC_MISSING"   // source object absent during copy
  | "VERSION_CONFLICT"   // expected version does not match stored version
  | "INTERNAL";          // unexpected driver-level failure

export interface StorageError {
  readonly code: StorageErrorCode;
  readonly message: string;
  /** Original cause, if available. */
  readonly cause?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Types
// ─────────────────────────────────────────────────────────────────────────────

/** Opaque key that identifies an object within a driver instance. */
export type ObjectKey = string;

/** Raw payload stored and retrieved as a byte array. */
export type ObjectPayload = Uint8Array;

/** Immutable snapshot of an object's metadata. */
export interface ObjectMeta {
  readonly key: ObjectKey;
  readonly sizeBytes: number;
  readonly mimeType: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 last-modified timestamp. */
  readonly updatedAt: string;
  /**
   * Monotonically increasing version token.
   * Starts at "1", increments on every successful write/copy-over.
   */
  readonly version: string;
  /** Arbitrary caller-supplied key→value pairs (e.g. content-disposition). */
  readonly customMetadata: Readonly<Record<string, string>>;
}

// ─── Write options ────────────────────────────────────────────────────────────

export interface WriteOptions {
  mimeType?: string;
  customMetadata?: Record<string, string>;
  /**
   * If set, the write succeeds only when the stored version matches.
   * Pass `"NEW"` to require that the object does not yet exist.
   */
  ifVersionMatch?: string | "NEW";
}

// ─── Copy options ─────────────────────────────────────────────────────────────

export interface CopyOptions {
  /** Override MIME type on the destination. */
  mimeType?: string;
  /** Merge or replace custom metadata on the destination. */
  customMetadata?: Record<string, string>;
  /** Fail if destination already exists. */
  failIfExists?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// StorageDriver Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal, mockable storage abstraction.
 *
 * All operations are async and return a `StorageResult<T>` — callers never
 * need to catch exceptions from driver methods.
 */
export interface StorageDriver {
  // ── Write ──────────────────────────────────────────────────────────────────

  /**
   * Store `payload` at `key`.  Creates the object if absent, otherwise
   * replaces it (subject to `options.ifVersionMatch`).
   *
   * @returns Metadata of the newly written object.
   */
  write(
    key: ObjectKey,
    payload: ObjectPayload,
    options?: WriteOptions,
  ): Promise<StorageResult<ObjectMeta>>;

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * Fetch the raw bytes stored at `key`.
   *
   * @returns `NOT_FOUND` if the object does not exist.
   */
  read(key: ObjectKey): Promise<StorageResult<ObjectPayload>>;

  // ── Metadata ───────────────────────────────────────────────────────────────

  /**
   * Retrieve metadata without downloading the payload.
   *
   * @returns `NOT_FOUND` if the object does not exist.
   */
  stat(key: ObjectKey): Promise<StorageResult<ObjectMeta>>;

  /**
   * List metadata for all objects whose key begins with `prefix`.
   * Returns an empty array (not an error) when nothing matches.
   */
  list(prefix?: string): Promise<StorageResult<ObjectMeta[]>>;

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Permanently remove the object at `key`.
   *
   * @returns `NOT_FOUND` if the object does not exist.
   */
  delete(key: ObjectKey): Promise<StorageResult<void>>;

  // ── Copy / Version ─────────────────────────────────────────────────────────

  /**
   * Server-side copy from `srcKey` to `dstKey`.
   * The destination is created or overwritten (subject to `options.failIfExists`).
   *
   * @returns Metadata of the destination object after the copy.
   */
  copy(
    srcKey: ObjectKey,
    dstKey: ObjectKey,
    options?: CopyOptions,
  ): Promise<StorageResult<ObjectMeta>>;

  /**
   * Create a versioned snapshot of `key` at `snapshotKey`.
   * Thin wrapper around `copy`; drivers may override for native versioning.
   *
   * @returns Metadata of the snapshot object.
   */
  snapshot(
    key: ObjectKey,
    snapshotKey: ObjectKey,
  ): Promise<StorageResult<ObjectMeta>>;
}
