import { randomUUID } from 'node:crypto';
import { StorageError } from '../interfaces/IStorageDriver';
import type {
  StorageDriver,
  StorageHandle,
  FileMetadata,
  ReadOptions,
  ReadResult,
  ListFilesFilter,
  ListFilesResult,
  CopyResult,
  VersionInfo,
} from '../interfaces/IStorageDriver';

/**
 * In-memory fake implementation of StorageDriver for unit tests.
 *
 * No external dependencies, no disk I/O, no network calls.
 * All state lives in JS Maps/Arrays inside the instance.
 *
 * Design decisions:
 *  - fileId is auto-generated via crypto.randomUUID() when not supplied.
 *  - objectName is stored as-is (test callers are responsible for sanitisation).
 *  - Versions are tracked per fileId; each write appends a VersionInfo.
 *  - delete removes the current version but keeps version history.
 */
export class InMemoryFakeStorageDriver implements StorageDriver {
  /** fileId -> list of version records (oldest first) */
  private versions = new Map<string, VersionInfo[]>();

  /** Composite key `${fileId}:${objectName}` -> version record */
  private current = new Map<string, VersionInfo>();

  /** userId -> Set of fileIds owned by that user */
  private userFiles = new Map<string, Set<string>>();

  /** Whether the driver has been initialised */
  private ready = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.ready = true;
  }

  async destroy(): Promise<void> {
    this.versions.clear();
    this.current.clear();
    this.userFiles.clear();
    this.ready = false;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private assertReady(): void {
    if (!this.ready) {
      throw this.makeError('DRIVER_NOT_READY', 'Driver not initialised');
    }
  }

  private makeError(
    code: StorageError['code'],
    message: string,
    details?: { fileId?: string; objectName?: string; userId?: string },
  ): StorageError {
    return new StorageError({ code, message, ...details });
  }

  private currentKey(fileId: string, objectName: string): string {
    return `${fileId}:${objectName}`;
  }

  private record(
    fileId: string,
    objectName: string,
    sizeBytes: number,
    mimeType: string,
    userId: string,
  ): VersionInfo {
    const versionId = randomUUID();
    const now = new Date().toISOString();
    const entry: VersionInfo = {
      versionId,
      fileId,
      objectName,
      userId,
      sizeBytes,
      mimeType,
      createdAt: now,
      isCurrent: true,
    };

    let fileVers = this.versions.get(fileId);
    if (!fileVers) {
      fileVers = [];
      this.versions.set(fileId, fileVers);
    }

    // Mark previous versions as non-current
    for (const v of fileVers) {
      v.isCurrent = false;
    }

    fileVers.push(entry);
    this.current.set(this.currentKey(fileId, objectName), entry);

    // Track ownership
    let set = this.userFiles.get(userId);
    if (!set) {
      set = new Set();
      this.userFiles.set(userId, set);
    }
    set.add(fileId);

    return entry;
  }

  private lookup(fileId: string, objectName: string): VersionInfo | undefined {
    return this.current.get(this.currentKey(fileId, objectName));
  }

  // Bytes are stored separately so read() can return slices.
  private _bytes = new Map<string, Buffer>();

  // ── Write ────────────────────────────────────────────────────────────────

  async write(
    userId: string,
    objectName: string,
    buffer: Buffer,
    mimeType: string,
    fileId?: string,
  ): Promise<StorageHandle> {
    this.assertReady();

    const id = fileId ?? randomUUID();
    const ver = this.record(id, objectName, buffer.byteLength, mimeType, userId);
    this._bytes.set(this.currentKey(id, objectName), buffer);

    return {
      fileId: id,
      objectName,
      userId,
      mimeType,
      sizeBytes: buffer.byteLength,
      createdAt: ver.createdAt,
    };
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async read(fileId: string, objectName: string, options?: ReadOptions): Promise<ReadResult> {
    this.assertReady();

    const key = this.currentKey(fileId, objectName);
    const buffer = this._bytes.get(key);
    const entry = this.lookup(fileId, objectName);

    if (!buffer || !entry) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName });
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    let slice = buffer;
    if (offset > 0 || limit !== undefined) {
      const start = Math.min(offset, buffer.byteLength);
      const end = limit !== undefined ? start + limit : buffer.byteLength;
      slice = buffer.subarray(start, Math.min(end, buffer.byteLength));
    }

    return {
      buffer: slice,
      metadata: this.toMetadata(entry),
    };
  }

  // ── Metadata ─────────────────────────────────────────────────────────────

  async getMetadata(fileId: string, objectName: string): Promise<FileMetadata> {
    this.assertReady();

    const entry = this.lookup(fileId, objectName);
    if (!entry) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName });
    }

    return this.toMetadata(entry);
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async listFiles(filter?: ListFilesFilter): Promise<ListFilesResult> {
    this.assertReady();

    const items: FileMetadata[] = [];
    const seen = new Set<string>();

    for (const [key, entry] of this.current) {
      if (filter?.userId && entry.userId !== filter.userId) continue;
      if (filter?.mimeTypePrefix && !entry.mimeType.startsWith(filter.mimeTypePrefix)) continue;
      if (filter?.createdAtBefore && entry.createdAt > filter.createdAtBefore) continue;

      // Only include the current version per fileId
      if (seen.has(entry.fileId)) continue;
      seen.add(entry.fileId);

      items.push(this.toMetadata(entry));
    }

    // Sort by createdAt descending (most recent first)
    items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const limit = filter?.limit;
    const hasMore = limit ? items.length > limit : false;

    return {
      items: limit ? items.slice(0, limit) : items,
      hasMore,
    };
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async delete(fileId: string, objectName: string): Promise<void> {
    this.assertReady();

    const key = this.currentKey(fileId, objectName);
    const existed = this.current.delete(key);
    this._bytes.delete(key);

    if (!existed) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName });
    }
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  async copy(
    sourceFileId: string,
    sourceObjectName: string,
    targetObjectName: string,
  ): Promise<CopyResult> {
    this.assertReady();

    const source = this.lookup(sourceFileId, sourceObjectName);
    if (!source) {
      throw this.makeError('NOT_FOUND', `Source object not found: ${sourceObjectName}`, {
        fileId: sourceFileId,
        objectName: sourceObjectName,
      });
    }

    const buffer = this._bytes.get(this.currentKey(sourceFileId, sourceObjectName));
    if (!buffer) {
      throw this.makeError('NOT_FOUND', `Source bytes not found: ${sourceObjectName}`, {
        fileId: sourceFileId,
        objectName: sourceObjectName,
      });
    }

    // Copy uses the same fileId (same logical file, new version)
    const ver = this.record(sourceFileId, targetObjectName, buffer.byteLength, source.mimeType, source.userId);
    this._bytes.set(this.currentKey(sourceFileId, targetObjectName), buffer);

    return {
      handle: {
        fileId: sourceFileId,
        objectName: targetObjectName,
        userId: source.userId,
        mimeType: source.mimeType,
        sizeBytes: buffer.byteLength,
        createdAt: ver.createdAt,
      },
      isSameObject: sourceObjectName === targetObjectName,
    };
  }

  // ── Version ──────────────────────────────────────────────────────────────

  async listVersions(fileId: string): Promise<VersionInfo[]> {
    this.assertReady();

    const fileVers = this.versions.get(fileId);
    if (!fileVers || fileVers.length === 0) {
      return [];
    }

    // Return newest first
    return [...fileVers].reverse();
  }

  async getCurrentVersion(fileId: string): Promise<VersionInfo> {
    this.assertReady();

    const fileVers = this.versions.get(fileId);
    if (!fileVers || fileVers.length === 0) {
      throw this.makeError('NOT_FOUND', `No versions found for fileId: ${fileId}`, { fileId });
    }

    const current = fileVers.find((v) => v.isCurrent);
    if (!current) {
      throw this.makeError('NOT_FOUND', `No current version for fileId: ${fileId}`, { fileId });
    }

    return current;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private toMetadata(entry: VersionInfo): FileMetadata {
    return {
      fileId: entry.fileId,
      objectName: entry.objectName,
      userId: entry.userId,
      mimeType: entry.mimeType,
      sizeBytes: entry.sizeBytes,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
      hash: null,
    };
  }
}
