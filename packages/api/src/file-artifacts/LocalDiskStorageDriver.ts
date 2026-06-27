import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ArtifactFileError,
  ArtifactFileErrorCode,
  assertValidStorageObjectName,
  normalizeContentType,
} from 'librechat-data-provider';
import type {
  StorageCopyInput,
  StorageDriver,
  StorageObjectHandle,
  StorageReadInput,
  StorageReadResult,
  StorageWriteInput,
} from 'librechat-data-provider';
import { createArtifactId, safePathSegment, storageNotFound, validateStorageInput } from './ids';

type LocalDiskStorageDriverOptions = {
  rootDir: string;
};

export class LocalDiskStorageDriver implements StorageDriver {
  private ready = false;
  private versions = new Map<string, StorageObjectHandle>();
  private currentVersionByFile = new Map<string, string>();
  private rootDir: string;

  constructor(options: LocalDiskStorageDriverOptions) {
    this.rootDir = path.resolve(options.rootDir);
  }

  async initialize(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    this.ready = true;
  }

  async destroy(): Promise<void> {
    this.ready = false;
    this.versions.clear();
    this.currentVersionByFile.clear();
  }

  async write(input: StorageWriteInput): Promise<StorageObjectHandle> {
    this.assertReady();
    validateStorageInput(input);

    const objectName = assertValidStorageObjectName(input.objectName);
    const fileId = input.fileId ?? createArtifactId('file');
    const versionId = createArtifactId('filever');
    const storageKey = this.storageKey(input.userId, fileId, versionId, objectName);
    const absolutePath = this.resolveStoragePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    const handle: StorageObjectHandle = {
      fileId,
      versionId,
      userId: input.userId,
      objectName,
      contentType: normalizeContentType(input.contentType),
      sizeBytes: input.bytes.byteLength,
      storageKey,
      createdAt: new Date().toISOString(),
    };

    this.versions.set(this.key(input.userId, fileId, versionId), handle);
    this.currentVersionByFile.set(this.currentKey(input.userId, fileId), versionId);
    return handle;
  }

  async read(input: StorageReadInput): Promise<StorageReadResult> {
    this.assertReady();
    const handle = this.getHandle(input);
    const absolutePath = this.resolveStoragePath(handle.storageKey);
    const bytes = await readFile(absolutePath);

    return {
      handle,
      bytes: new Uint8Array(bytes),
    };
  }

  async stat(input: StorageReadInput): Promise<StorageObjectHandle> {
    this.assertReady();
    return this.getHandle(input);
  }

  async delete(input: StorageReadInput): Promise<void> {
    this.assertReady();
    const handle = this.getHandle(input);
    await rm(this.resolveStoragePath(handle.storageKey), { force: true });
    this.versions.delete(this.key(input.userId, input.fileId, handle.versionId));

    const currentKey = this.currentKey(input.userId, input.fileId);
    if (this.currentVersionByFile.get(currentKey) === handle.versionId) {
      this.currentVersionByFile.delete(currentKey);
    }
  }

  async copy(input: StorageCopyInput): Promise<StorageObjectHandle> {
    this.assertReady();
    const source = await this.read({
      userId: input.userId,
      fileId: input.source.fileId,
      versionId: input.source.versionId,
    });

    return this.write({
      userId: input.userId,
      fileId: input.targetFileId,
      objectName: input.objectName,
      contentType: source.handle.contentType,
      bytes: source.bytes,
    });
  }

  private assertReady(): void {
    if (!this.ready) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.STORAGE_NOT_READY,
        'Storage driver has not been initialized',
      );
    }
  }

  private getHandle(input: StorageReadInput): StorageObjectHandle {
    const versionId =
      input.versionId ?? this.currentVersionByFile.get(this.currentKey(input.userId, input.fileId));
    if (!versionId) {
      throw storageNotFound(input);
    }

    const handle = this.versions.get(this.key(input.userId, input.fileId, versionId));
    if (!handle) {
      throw storageNotFound({ ...input, versionId });
    }

    return handle;
  }

  private storageKey(
    userId: string,
    fileId: string,
    versionId: string,
    objectName: string,
  ): string {
    return path.posix.join(
      'users',
      safePathSegment(userId),
      'files',
      safePathSegment(fileId),
      'versions',
      safePathSegment(versionId),
      objectName,
    );
  }

  private resolveStoragePath(storageKey: string): string {
    const absolutePath = path.resolve(this.rootDir, storageKey);
    const relative = path.relative(this.rootDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new ArtifactFileError(
        ArtifactFileErrorCode.INVALID_OBJECT_NAME,
        'Storage key resolved outside the configured root',
        { storageKey },
      );
    }
    return absolutePath;
  }

  private key(userId: string, fileId: string, versionId: string): string {
    return `${userId}:${fileId}:${versionId}`;
  }

  private currentKey(userId: string, fileId: string): string {
    return `${userId}:${fileId}`;
  }
}
