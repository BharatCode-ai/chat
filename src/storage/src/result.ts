import type { StorageOk, StorageErr, StorageError, StorageErrorCode } from "./types.js";

/** Construct a successful result. */
export function ok<T>(value: T): StorageOk<T> {
  return { ok: true, value };
}

/** Construct an error result. */
export function err(
  code: StorageErrorCode,
  message: string,
  cause?: unknown,
): StorageErr {
  const error: StorageError = cause !== undefined
    ? { code, message, cause }
    : { code, message };
  return { ok: false, error };
}
