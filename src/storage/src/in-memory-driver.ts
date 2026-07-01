import type {
  StorageDriver,
  StorageResult,
  ObjectKey,
  ObjectPayload,
  ObjectMeta,
  WriteOptions,
  CopyOptions,
} from "./types.js";
import { ok, err } from "./result.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal record
// ─────────────────────────────────────────────────────────────────────────────

interface StoredObject {
  payload: ObjectPayload;
  meta: ObjectMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const KEY_RE = /^[a-zA-Z0-9\-_./]+$/;
const MAX_KEY_LEN = 1_024;

function validateKey(key: ObjectKey): string | null {
  if (!key || key.length > MAX_KEY_LEN) {
    return `Key must be 1–${MAX_KEY_LEN} characters.`;
  }
  if (!KEY_RE.test(key)) {
    return "Key may only contain letters, digits, -, _, ., and /.";
  }
  if (key.includes("..")) {
    return 'Key must not contain ".." (path traversal).';
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────────────────────

type Clock = () => string; // returns ISO-8601

function defaultClock(): string {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// InMemoryStorageDriver
// ─────────────────────────────────────────────────────────────────────────────

export interface InMemoryDriverOptions {
  /** Override the clock for deterministic tests. */
  clock?: Clock;
  /** Maximum payload size in bytes (default: unlimited). */
  maxSizeBytes?: number;
  /** Accepted MIME types; empty/undefined = accept all. */
  allowedMimeTypes?: string[];
}

/**
 * In-memory implementation of `StorageDriver`.
 *
 * Suitable for unit tests and local development. Holds all data in a plain
 * `Map`; state is lost when the instance is discarded.
 */
export class InMemoryStorageDriver implements StorageDriver {
  private readonly store = new Map<ObjectKey, StoredObject>();
  private readonly clock: Clock;
  private readonly maxSizeBytes: number;
  private readonly allowedMimeTypes: Set<string> | null;

  constructor(options: InMemoryDriverOptions = {}) {
    this.clock = options.clock ?? defaultClock;
    this.maxSizeBytes = options.maxSizeBytes ?? Infinity;
    this.allowedMimeTypes =
      options.allowedMimeTypes && options.allowedMimeTypes.length > 0
        ? new Set(options.allowedMimeTypes)
        : null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private checkKey(key: ObjectKey): StorageResult<void> | null {
    const msg = validateKey(key);
    if (msg) return err("INVALID_KEY", msg);
    return null;
  }

  private checkMime(mimeType: string): StorageResult<void> | null {
    if (this.allowedMimeTypes && !this.allowedMimeTypes.has(mimeType)) {
      return err(
        "INVALID_MIME",
        `MIME type "${mimeType}" is not permitted by this driver.`,
      );
    }
    return null;
  }

  private nextVersion(current?: string): string {
    return String((parseInt(current ?? "0", 10) + 1));
  }

  private buildMeta(
    key: ObjectKey,
    payload: ObjectPayload,
    mimeType: string,
    customMetadata: Record<string, string>,
    now: string,
    version: string,
    createdAt?: string,
  ): ObjectMeta {
    return {
      key,
      sizeBytes: payload.byteLength,
      mimeType,
      createdAt: createdAt ?? now,
      updatedAt: now,
      version,
      customMetadata: { ...customMetadata },
    };
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async write(
    key: ObjectKey,
    payload: ObjectPayload,
    options: WriteOptions = {},
  ): Promise<StorageResult<ObjectMeta>> {
    const keyErr = this.checkKey(key);
    if (keyErr) return keyErr;

    const mimeType = options.mimeType ?? "application/octet-stream";
    const mimeErr = this.checkMime(mimeType);
    if (mimeErr) return mimeErr;

    if (payload.byteLength > this.maxSizeBytes) {
      return err(
        "SIZE_EXCEEDED",
        `Payload (${payload.byteLength} B) exceeds driver limit (${this.maxSizeBytes} B).`,
      );
    }

    const existing = this.store.get(key);

    if (options.ifVersionMatch !== undefined) {
      if (options.ifVersionMatch === "NEW") {
        if (existing) {
          return err("ALREADY_EXISTS", `Object "${key}" already exists.`);
        }
      } else {
        if (!existing) {
          return err("NOT_FOUND", `Object "${key}" not found.`);
        }
        if (existing.meta.version !== options.ifVersionMatch) {
          return err(
            "VERSION_CONFLICT",
            `Version conflict on "${key}": expected "${options.ifVersionMatch}", found "${existing.meta.version}".`,
          );
        }
      }
    }

    const now = this.clock();
    const version = this.nextVersion(existing?.meta.version);
    const meta = this.buildMeta(
      key,
      payload,
      mimeType,
      options.customMetadata ?? {},
      now,
      version,
      existing?.meta.createdAt,
    );

    this.store.set(key, { payload: new Uint8Array(payload), meta });
    return ok(meta);
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async read(key: ObjectKey): Promise<StorageResult<ObjectPayload>> {
    const keyErr = this.checkKey(key);
    if (keyErr) return keyErr;

    const stored = this.store.get(key);
    if (!stored) return err("NOT_FOUND", `Object "${key}" not found.`);

    // Return a copy to keep the driver's internal state immutable.
    return ok(new Uint8Array(stored.payload));
  }

  // ── Metadata ──────────────────────────────────────────────────────────────

  async stat(key: ObjectKey): Promise<StorageResult<ObjectMeta>> {
    const keyErr = this.checkKey(key);
    if (keyErr) return keyErr;

    const stored = this.store.get(key);
    if (!stored) return err("NOT_FOUND", `Object "${key}" not found.`);

    return ok({ ...stored.meta, customMetadata: { ...stored.meta.customMetadata } });
  }

  async list(prefix = ""): Promise<StorageResult<ObjectMeta[]>> {
    const results: ObjectMeta[] = [];
    for (const [k, v] of this.store) {
      if (k.startsWith(prefix)) {
        results.push({ ...v.meta, customMetadata: { ...v.meta.customMetadata } });
      }
    }
    // Stable sort by key for deterministic test output.
    results.sort((a, b) => a.key.localeCompare(b.key));
    return ok(results);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(key: ObjectKey): Promise<StorageResult<void>> {
    const keyErr = this.checkKey(key);
    if (keyErr) return keyErr;

    if (!this.store.has(key)) {
      return err("NOT_FOUND", `Object "${key}" not found.`);
    }
    this.store.delete(key);
    return ok(undefined);
  }

  // ── Copy / Version ────────────────────────────────────────────────────────

  async copy(
    srcKey: ObjectKey,
    dstKey: ObjectKey,
    options: CopyOptions = {},
  ): Promise<StorageResult<ObjectMeta>> {
    const srcErr = this.checkKey(srcKey);
    if (srcErr) return srcErr;
    const dstErr = this.checkKey(dstKey);
    if (dstErr) return dstErr;

    const src = this.store.get(srcKey);
    if (!src) {
      return err("COPY_SRC_MISSING", `Source object "${srcKey}" not found.`);
    }

    if (options.failIfExists && this.store.has(dstKey)) {
      return err("ALREADY_EXISTS", `Destination object "${dstKey}" already exists.`);
    }

    const existing = this.store.get(dstKey);
    const mimeType = options.mimeType ?? src.meta.mimeType;
    const mimeErr = this.checkMime(mimeType);
    if (mimeErr) return mimeErr;

    const customMetadata = options.customMetadata !== undefined
      ? { ...options.customMetadata }
      : { ...src.meta.customMetadata };

    const now = this.clock();
    const version = this.nextVersion(existing?.meta.version);
    const meta = this.buildMeta(
      dstKey,
      src.payload,
      mimeType,
      customMetadata,
      now,
      version,
      existing?.meta.createdAt,
    );

    this.store.set(dstKey, { payload: new Uint8Array(src.payload), meta });
    return ok(meta);
  }

  async snapshot(
    key: ObjectKey,
    snapshotKey: ObjectKey,
  ): Promise<StorageResult<ObjectMeta>> {
    return this.copy(key, snapshotKey, { failIfExists: true });
  }

  // ── Test helpers ──────────────────────────────────────────────────────────

  /** Number of objects currently in the store (useful for assertions). */
  get size(): number {
    return this.store.size;
  }

  /** Wipe all stored objects. */
  clear(): void {
    this.store.clear();
  }
}
