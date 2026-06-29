import { InMemoryStorageDriver } from '../driver/InMemoryStorageDriver';
import { StorageErrorCode } from '../driver/types';
import type { StorageDriver } from '../driver/StorageDriver';

describe('InMemoryStorageDriver', () => {
  let driver: StorageDriver;

  beforeEach(() => {
    const instance = new InMemoryStorageDriver();
    instance.reset();
    driver = instance;
  });

  // ---------------------------------------------------------------------------
  // write
  // ---------------------------------------------------------------------------
  describe('write()', () => {
    it('writes a file and returns a versionId', async () => {
      const result = await driver.write('docs/hello.txt', Buffer.from('hello'));

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(typeof result.data.versionId).toBe('string');
      expect(result.data.versionId.length).toBeGreaterThan(0);
    });

    it('creates a new version on subsequent writes to the same path', async () => {
      const r1 = await driver.write('docs/hello.txt', Buffer.from('v1'));
      const r2 = await driver.write('docs/hello.txt', Buffer.from('v2'));

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      if (!r1.success || !r2.success) return;
      expect(r1.data.versionId).not.toBe(r2.data.versionId);
    });

    it('returns INVALID_PATH for an empty path', async () => {
      const result = await driver.write('', Buffer.from('data'));

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });

    it('returns INVALID_PATH for a whitespace-only path', async () => {
      const result = await driver.write('   ', Buffer.from('data'));

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // read
  // ---------------------------------------------------------------------------
  describe('read()', () => {
    it('reads back the content of a written file', async () => {
      const content = Buffer.from('hello world');
      await driver.write('docs/hello.txt', content);

      const result = await driver.read('docs/hello.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual(content);
    });

    it('reads the latest version after multiple writes', async () => {
      await driver.write('docs/hello.txt', Buffer.from('first'));
      await driver.write('docs/hello.txt', Buffer.from('second'));

      const result = await driver.read('docs/hello.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.toString()).toBe('second');
    });

    it('returns NOT_FOUND for a path that was never written', async () => {
      const result = await driver.read('does/not/exist.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns INVALID_PATH for an empty path', async () => {
      const result = await driver.read('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // getMetadata
  // ---------------------------------------------------------------------------
  describe('getMetadata()', () => {
    it('returns correct metadata for a written file', async () => {
      const content = Buffer.from('metadata test');
      const before = new Date();
      const writeResult = await driver.write('docs/meta.txt', content);
      const after = new Date();

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) return;

      const result = await driver.getMetadata('docs/meta.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.path).toBe('docs/meta.txt');
      expect(result.data.size).toBe(content.length);
      expect(result.data.versionId).toBe(writeResult.data.versionId);
      expect(result.data.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.data.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.data.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('reflects the latest version size and versionId after re-write', async () => {
      await driver.write('docs/meta.txt', Buffer.from('small'));
      const r2 = await driver.write('docs/meta.txt', Buffer.from('much larger content'));

      expect(r2.success).toBe(true);
      if (!r2.success) return;

      const result = await driver.getMetadata('docs/meta.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.size).toBe(Buffer.from('much larger content').length);
      expect(result.data.versionId).toBe(r2.data.versionId);
    });

    it('returns NOT_FOUND for a missing path', async () => {
      const result = await driver.getMetadata('no/such/file.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns INVALID_PATH for an empty path', async () => {
      const result = await driver.getMetadata('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete()', () => {
    it('deletes an existing file', async () => {
      await driver.write('docs/delete-me.txt', Buffer.from('bye'));

      const deleteResult = await driver.delete('docs/delete-me.txt');
      expect(deleteResult.success).toBe(true);

      const readResult = await driver.read('docs/delete-me.txt');
      expect(readResult.success).toBe(false);
      if (readResult.success) return;
      expect(readResult.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns NOT_FOUND when deleting a path that does not exist', async () => {
      const result = await driver.delete('ghost/file.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('removes all version history after delete', async () => {
      await driver.write('docs/versioned.txt', Buffer.from('v1'));
      await driver.write('docs/versioned.txt', Buffer.from('v2'));
      await driver.delete('docs/versioned.txt');

      const result = await driver.listVersions('docs/versioned.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns INVALID_PATH for an empty path', async () => {
      const result = await driver.delete('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // copy
  // ---------------------------------------------------------------------------
  describe('copy()', () => {
    it('copies content from source to destination', async () => {
      const content = Buffer.from('copy me');
      await driver.write('src/original.txt', content);

      const copyResult = await driver.copy('src/original.txt', 'dst/copy.txt');
      expect(copyResult.success).toBe(true);

      const readResult = await driver.read('dst/copy.txt');
      expect(readResult.success).toBe(true);
      if (!readResult.success) return;
      expect(readResult.data).toEqual(content);
    });

    it('source remains intact after copy', async () => {
      await driver.write('src/original.txt', Buffer.from('still here'));
      await driver.copy('src/original.txt', 'dst/copy.txt');

      const result = await driver.read('src/original.txt');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.toString()).toBe('still here');
    });

    it('copy to existing destination creates a new version', async () => {
      await driver.write('src/original.txt', Buffer.from('source content'));
      await driver.write('dst/existing.txt', Buffer.from('old content'));

      const copyResult = await driver.copy('src/original.txt', 'dst/existing.txt');
      expect(copyResult.success).toBe(true);

      const versionsResult = await driver.listVersions('dst/existing.txt');
      expect(versionsResult.success).toBe(true);
      if (!versionsResult.success) return;
      expect(versionsResult.data.length).toBe(2);
    });

    it('returns NOT_FOUND when the source does not exist', async () => {
      const result = await driver.copy('src/missing.txt', 'dst/anywhere.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns INVALID_PATH for an empty source path', async () => {
      const result = await driver.copy('', 'dst/anywhere.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });

    it('returns INVALID_PATH for an empty destination path', async () => {
      await driver.write('src/file.txt', Buffer.from('data'));
      const result = await driver.copy('src/file.txt', '');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // listVersions
  // ---------------------------------------------------------------------------
  describe('listVersions()', () => {
    it('returns a single version after first write', async () => {
      await driver.write('docs/versioned.txt', Buffer.from('v1'));

      const result = await driver.listVersions('docs/versioned.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1);
    });

    it('returns versions in oldest-first order', async () => {
      await driver.write('docs/versioned.txt', Buffer.from('first'));
      await driver.write('docs/versioned.txt', Buffer.from('second'));
      await driver.write('docs/versioned.txt', Buffer.from('third'));

      const result = await driver.listVersions('docs/versioned.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(3);

      // versionIds should be in ascending order (v0001 < v0002 < v0003)
      const ids = result.data.map((v) => v.versionId);
      expect(ids).toEqual([...ids].sort());
    });

    it('each version entry includes versionId, size, and createdAt', async () => {
      const content = Buffer.from('check fields');
      await driver.write('docs/versioned.txt', content);

      const result = await driver.listVersions('docs/versioned.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      const [entry] = result.data;
      expect(typeof entry.versionId).toBe('string');
      expect(entry.size).toBe(content.length);
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('reflects correct sizes for each version', async () => {
      await driver.write('docs/sized.txt', Buffer.from('a'));
      await driver.write('docs/sized.txt', Buffer.from('bb'));
      await driver.write('docs/sized.txt', Buffer.from('ccc'));

      const result = await driver.listVersions('docs/sized.txt');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.map((v) => v.size)).toEqual([1, 2, 3]);
    });

    it('returns NOT_FOUND for a path that was never written', async () => {
      const result = await driver.listVersions('no/such/file.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.NOT_FOUND);
    });

    it('returns INVALID_PATH for an empty path', async () => {
      const result = await driver.listVersions('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(StorageErrorCode.INVALID_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // error shape
  // ---------------------------------------------------------------------------
  describe('StorageError shape', () => {
    it('error result always has code and message fields', async () => {
      const result = await driver.read('missing.txt');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect(typeof result.error.message).toBe('string');
    });
  });
});
