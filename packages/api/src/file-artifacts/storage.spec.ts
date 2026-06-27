import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtifactFileErrorCode } from 'librechat-data-provider';
import { InMemoryStorageDriver } from './InMemoryStorageDriver';
import { LocalDiskStorageDriver } from './LocalDiskStorageDriver';
import type { StorageDriver } from 'librechat-data-provider';

const bytes = (value: string) => new Uint8Array(Buffer.from(value, 'utf8'));
const text = (value: Uint8Array) => Buffer.from(value).toString('utf8');

const runStorageContract = (
  name: string,
  createDriver: () => Promise<{ driver: StorageDriver; cleanup: () => Promise<void> }>,
) => {
  describe(name, () => {
    let driver: StorageDriver;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const created = await createDriver();
      driver = created.driver;
      cleanup = created.cleanup;
      await driver.initialize();
    });

    afterEach(async () => {
      await driver.destroy();
      await cleanup();
    });

    it('writes immutable file versions and reads them by owner', async () => {
      const first = await driver.write({
        userId: 'user_123',
        objectName: 'notes.md',
        contentType: 'text/markdown',
        bytes: bytes('# First'),
      });

      const second = await driver.write({
        userId: 'user_123',
        fileId: first.fileId,
        objectName: 'notes.md',
        contentType: 'text/markdown',
        bytes: bytes('# Second'),
      });

      expect(second.fileId).toBe(first.fileId);
      expect(second.versionId).not.toBe(first.versionId);
      await expect(
        driver.read({ userId: 'user_123', fileId: first.fileId }),
      ).resolves.toMatchObject({
        handle: second,
      });
      await expect(
        driver.read({ userId: 'user_123', fileId: first.fileId, versionId: first.versionId }),
      ).resolves.toMatchObject({
        bytes: bytes('# First'),
      });
    });

    it('keeps user ownership scoped at read time', async () => {
      const handle = await driver.write({
        userId: 'user_123',
        objectName: 'report.pdf',
        contentType: 'application/pdf',
        bytes: bytes('%PDF-1.7\n%%EOF'),
      });

      await expect(
        driver.read({ userId: 'user_456', fileId: handle.fileId, versionId: handle.versionId }),
      ).rejects.toMatchObject({ code: ArtifactFileErrorCode.STORAGE_NOT_FOUND });
    });

    it('copies bytes into a new logical file by default', async () => {
      const source = await driver.write({
        userId: 'user_123',
        objectName: 'analysis.csv',
        contentType: 'text/csv',
        bytes: bytes('city,count\nDelhi,5\n'),
      });

      const copied = await driver.copy({
        userId: 'user_123',
        source,
        objectName: 'analysis-copy.csv',
      });

      expect(copied.fileId).not.toBe(source.fileId);
      const copiedBytes = await driver.read({
        userId: 'user_123',
        fileId: copied.fileId,
        versionId: copied.versionId,
      });
      expect(text(copiedBytes.bytes)).toBe('city,count\nDelhi,5\n');
    });

    it('rejects path traversal object names', async () => {
      await expect(
        driver.write({
          userId: 'user_123',
          objectName: '../escape.md',
          contentType: 'text/markdown',
          bytes: bytes('# Nope'),
        }),
      ).rejects.toMatchObject({ code: ArtifactFileErrorCode.INVALID_OBJECT_NAME });
    });
  });
};

runStorageContract('InMemoryStorageDriver', async () => ({
  driver: new InMemoryStorageDriver(),
  cleanup: async () => undefined,
}));

runStorageContract('LocalDiskStorageDriver', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'bharatcode-artifacts-'));

  return {
    driver: new LocalDiskStorageDriver({ rootDir }),
    cleanup: async () => {
      await rm(rootDir, { recursive: true, force: true });
    },
  };
});
