import { StorageErrorCode } from './types';
import type {
  StorageDriver,
  StorageError,
  StorageFileMetadata,
  StorageResult,
  StorageVersionEntry,
} from './StorageDriver';

interface VersionRecord {
  content: Buffer;
  versionId: string;
  createdAt: Date;
}

interface FileRecord {
  versions: VersionRecord[];
  createdAt: Date;
}

/** Simple incrementing counter for deterministic version IDs in tests */
let versionCounter = 0;

function nextVersionId(): string {
  versionCounter += 1;
  return `v${String(versionCounter).padStart(4, '0')}`;
}

function makeError(
  code: StorageErrorCode,
  message: string,
): { success: false; error: StorageError } {
  return { success: false, error: { code, message } };
}

function isValidPath(path: string): boolean {
  return typeof path === 'string' && path.trim().length > 0;
}

/**
 * InMemoryStorageDriver — test-friendly fake that satisfies the StorageDriver
 * interface using only in-process Maps. No filesystem, no cloud, no network.
 */
export class InMemoryStorageDriver implements StorageDriver {
  private readonly store = new Map<string, FileRecord>();

  /** Reset all state — useful between tests */
  reset(): void {
    this.store.clear();
    versionCounter = 0;
  }

  async write(path: string, content: Buffer): Promise<StorageResult<{ versionId: string }>> {
    if (!isValidPath(path)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid path: "${path}"`);
    }

    const versionId = nextVersionId();
    const now = new Date();
    const version: VersionRecord = { content, versionId, createdAt: now };

    const existing = this.store.get(path);
    if (existing != null) {
      existing.versions.push(version);
    } else {
      this.store.set(path, { versions: [version], createdAt: now });
    }

    return { success: true, data: { versionId } };
  }

  async read(path: string): Promise<StorageResult<Buffer>> {
    if (!isValidPath(path)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid path: "${path}"`);
    }

    const record = this.store.get(path);
    if (record == null || record.versions.length === 0) {
      return makeError(StorageErrorCode.NOT_FOUND, `File not found: "${path}"`);
    }

    const latest = record.versions[record.versions.length - 1];
    return { success: true, data: latest.content };
  }

  async getMetadata(path: string): Promise<StorageResult<StorageFileMetadata>> {
    if (!isValidPath(path)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid path: "${path}"`);
    }

    const record = this.store.get(path);
    if (record == null || record.versions.length === 0) {
      return makeError(StorageErrorCode.NOT_FOUND, `File not found: "${path}"`);
    }

    const latest = record.versions[record.versions.length - 1];
    const metadata: StorageFileMetadata = {
      path,
      size: latest.content.length,
      createdAt: record.createdAt,
      updatedAt: latest.createdAt,
      versionId: latest.versionId,
    };

    return { success: true, data: metadata };
  }

  async delete(path: string): Promise<StorageResult<void>> {
    if (!isValidPath(path)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid path: "${path}"`);
    }

    if (!this.store.has(path)) {
      return makeError(StorageErrorCode.NOT_FOUND, `File not found: "${path}"`);
    }

    this.store.delete(path);
    return { success: true, data: undefined };
  }

  async copy(sourcePath: string, destPath: string): Promise<StorageResult<{ versionId: string }>> {
    if (!isValidPath(sourcePath)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid source path: "${sourcePath}"`);
    }
    if (!isValidPath(destPath)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid destination path: "${destPath}"`);
    }

    const sourceRecord = this.store.get(sourcePath);
    if (sourceRecord == null || sourceRecord.versions.length === 0) {
      return makeError(StorageErrorCode.NOT_FOUND, `Source file not found: "${sourcePath}"`);
    }

    const latestContent = sourceRecord.versions[sourceRecord.versions.length - 1].content;
    return this.write(destPath, Buffer.from(latestContent));
  }

  async listVersions(path: string): Promise<StorageResult<StorageVersionEntry[]>> {
    if (!isValidPath(path)) {
      return makeError(StorageErrorCode.INVALID_PATH, `Invalid path: "${path}"`);
    }

    const record = this.store.get(path);
    if (record == null) {
      return makeError(StorageErrorCode.NOT_FOUND, `File not found: "${path}"`);
    }

    const versions: StorageVersionEntry[] = record.versions.map((v) => ({
      versionId: v.versionId,
      size: v.content.length,
      createdAt: v.createdAt,
    }));

    return { success: true, data: versions };
  }
}
