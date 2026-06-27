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
import { createArtifactId, storageNotFound, validateStorageInput } from './ids';

type StoredVersion = {
  handle: StorageObjectHandle;
  bytes: Uint8Array;
};

export class InMemoryStorageDriver implements StorageDriver {
  private ready = false;
  private versions = new Map<string, StoredVersion>();
  private currentVersionByFile = new Map<string, string>();

  async initialize(): Promise<void> {
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
    const handle: StorageObjectHandle = {
      fileId,
      versionId,
      userId: input.userId,
      objectName,
      contentType: normalizeContentType(input.contentType),
      sizeBytes: input.bytes.byteLength,
      storageKey: `memory://${input.userId}/${fileId}/${versionId}/${objectName}`,
      createdAt: new Date().toISOString(),
    };

    this.versions.set(this.key(input.userId, fileId, versionId), {
      handle,
      bytes: new Uint8Array(input.bytes),
    });
    this.currentVersionByFile.set(this.currentKey(input.userId, fileId), versionId);

    return handle;
  }

  async read(input: StorageReadInput): Promise<StorageReadResult> {
    this.assertReady();
    const stored = this.getStored(input);

    return {
      handle: stored.handle,
      bytes: new Uint8Array(stored.bytes),
    };
  }

  async stat(input: StorageReadInput): Promise<StorageObjectHandle> {
    this.assertReady();
    return this.getStored(input).handle;
  }

  async delete(input: StorageReadInput): Promise<void> {
    this.assertReady();
    const stored = this.getStored(input);
    this.versions.delete(this.key(input.userId, input.fileId, stored.handle.versionId));

    const currentKey = this.currentKey(input.userId, input.fileId);
    if (this.currentVersionByFile.get(currentKey) === stored.handle.versionId) {
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

  private getStored(input: StorageReadInput): StoredVersion {
    const versionId =
      input.versionId ?? this.currentVersionByFile.get(this.currentKey(input.userId, input.fileId));
    if (!versionId) {
      throw storageNotFound(input);
    }

    const stored = this.versions.get(this.key(input.userId, input.fileId, versionId));
    if (!stored) {
      throw storageNotFound({ ...input, versionId });
    }

    return stored;
  }

  private key(userId: string, fileId: string, versionId: string): string {
    return `${userId}:${fileId}:${versionId}`;
  }

  private currentKey(userId: string, fileId: string): string {
    return `${userId}:${fileId}`;
  }
}
