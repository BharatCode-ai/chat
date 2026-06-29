/** Deterministic error codes for all StorageDriver operations */
export enum StorageErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INVALID_PATH = 'INVALID_PATH',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/** Typed error returned by StorageDriver operations */
export interface StorageError {
  code: StorageErrorCode;
  message: string;
}

/** Discriminated union result type for all StorageDriver operations */
export type StorageResult<T> = { success: true; data: T } | { success: false; error: StorageError };

/** Metadata describing a stored file */
export interface StorageFileMetadata {
  path: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  versionId: string;
}

/** A single version entry returned by listVersions */
export interface StorageVersionEntry {
  versionId: string;
  size: number;
  createdAt: Date;
}
