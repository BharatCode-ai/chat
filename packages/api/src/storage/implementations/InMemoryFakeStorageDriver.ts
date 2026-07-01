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

  /** fileId -> version record */
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
    this._bytes.clear();
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
    this.current.set(fileId, entry);

    // Track ownership
    let set = this.userFiles.get(userId);
    if (!set) {
      set = new Set();
      this.userFiles.set(userId, set);
    }
    set.add(fileId);

    return entry;
  }

  private lookup(userId: string, fileId: string, objectName: string): VersionInfo | undefined {
    const entry = this.current.get(fileId);
    if (entry && entry.objectName === objectName && entry.userId === userId) {
      return entry;
    }
    return undefined;
  }

  // Bytes are stored keyed by versionId
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
    
    // Enforce ownership if file already exists
    const existing = this.userFiles.get(userId);
    const allVersions = this.versions.get(id);
    if (allVersions && allVersions.length > 0) {
      if (!existing || !existing.has(id)) {
         throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId: id, objectName, userId });
      }
    }

    const ver = this.record(id, objectName, buffer.byteLength, mimeType, userId);
    this._bytes.set(ver.versionId, Buffer.from(buffer)); // Copy on write

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

  async read(userId: string, fileId: string, objectName: string, options?: ReadOptions): Promise<ReadResult> {
    this.assertReady();

    const entry = this.lookup(userId, fileId, objectName);
    if (!entry) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName, userId });
    }

    const buffer = this._bytes.get(entry.versionId);
    if (!buffer) {
      throw this.makeError('NOT_FOUND', `Object bytes not found: ${objectName}`, { fileId, objectName, userId });
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
      buffer: Buffer.from(slice), // Copy on read
      metadata: this.toMetadata(entry),
    };
  }

  // ── Metadata ─────────────────────────────────────────────────────────────

  async getMetadata(userId: string, fileId: string, objectName: string): Promise<FileMetadata> {
    this.assertReady();

    const entry = this.lookup(userId, fileId, objectName);
    if (!entry) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName, userId });
    }

    return this.toMetadata(entry);
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async listFiles(filter?: ListFilesFilter): Promise<ListFilesResult> {
    this.assertReady();

    const items: FileMetadata[] = [];

    for (const entry of this.current.values()) {
      if (filter?.userId && entry.userId !== filter.userId) continue;
      if (filter?.mimeTypePrefix && !entry.mimeType.startsWith(filter.mimeTypePrefix)) continue;
      if (filter?.createdAtBefore && entry.createdAt > filter.createdAtBefore) continue;

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

  async delete(userId: string, fileId: string, objectName: string): Promise<void> {
    this.assertReady();

    const entry = this.lookup(userId, fileId, objectName);
    if (!entry) {
      throw this.makeError('NOT_FOUND', `Object not found: ${objectName}`, { fileId, objectName, userId });
    }

    this.current.delete(fileId);
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  async copy(
    userId: string,
    sourceFileId: string,
    sourceObjectName: string,
    targetObjectName: string,
  ): Promise<CopyResult> {
    this.assertReady();

    const source = this.lookup(userId, sourceFileId, sourceObjectName);
    if (!source) {
      throw this.makeError('NOT_FOUND', `Source object not found: ${sourceObjectName}`, {
        fileId: sourceFileId,
        objectName: sourceObjectName,
        userId
      });
    }

    const buffer = this._bytes.get(source.versionId);
    if (!buffer) {
      throw this.makeError('NOT_FOUND', `Source bytes not found: ${sourceObjectName}`, {
        fileId: sourceFileId,
        objectName: sourceObjectName,
        userId
      });
    }

    // Copy uses the same fileId (same logical file, new version)
    const ver = this.record(sourceFileId, targetObjectName, buffer.byteLength, source.mimeType, source.userId);
    this._bytes.set(ver.versionId, Buffer.from(buffer)); // Copy on copy

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

  async listVersions(userId: string, fileId: string): Promise<VersionInfo[]> {
    this.assertReady();

    // Enforce ownership
    const existing = this.userFiles.get(userId);
    if (!existing || !existing.has(fileId)) {
        return [];
    }

    const fileVers = this.versions.get(fileId);
    if (!fileVers || fileVers.length === 0) {
      return [];
    }

    // Return newest first
    return [...fileVers].reverse();
  }

  async getCurrentVersion(userId: string, fileId: string): Promise<VersionInfo> {
    this.assertReady();

    const entry = this.current.get(fileId);
    if (!entry || entry.userId !== userId) {
      throw this.makeError('NOT_FOUND', `No current version for fileId: ${fileId}`, { fileId, userId });
    }

    return entry;
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
