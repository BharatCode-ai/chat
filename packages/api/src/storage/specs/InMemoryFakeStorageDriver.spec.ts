import { InMemoryFakeStorageDriver } from '../implementations/InMemoryFakeStorageDriver';
import type { StorageHandle } from '../interfaces/IStorageDriver';

describe('InMemoryFakeStorageDriver', () => {
  let driver: InMemoryFakeStorageDriver;

  beforeEach(() => {
    driver = new InMemoryFakeStorageDriver();
  });

  afterEach(async () => {
    await driver.destroy();
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────

  describe('initialize / destroy', () => {
    it('should become ready after initialize()', async () => {
      await driver.initialize();
      const handle = await driver.write('u1', 'test.txt', Buffer.from('hello'), 'text/plain');
      expect(handle).toBeDefined();
    });

    it('should throw NOT_READY when used before initialize()', async () => {
      const promise = driver.write('u1', 'test.txt', Buffer.from('hello'), 'text/plain');
      await expect(promise).rejects.toThrow('DRIVER_NOT_READY');
    });

    it('should clear state after destroy()', async () => {
      await driver.initialize();
      await driver.write('u1', 'test.txt', Buffer.from('hello'), 'text/plain');
      await driver.destroy();

      // After destroy, driver should not be ready
      const promise = driver.write('u1', 'test.txt', Buffer.from('hello'), 'text/plain');
      await expect(promise).rejects.toThrow('DRIVER_NOT_READY');
    });
  });

  // ── Write ────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('should store bytes and return a handle', async () => {
      await driver.initialize();
      const buf = Buffer.from('bharatcode file content');
      const handle = await driver.write('user-1', 'docs/report.pdf', buf, 'application/pdf');

      expect(handle).toMatchObject({
        fileId: expect.any(String),
        objectName: 'docs/report.pdf',
        userId: 'user-1',
        mimeType: 'application/pdf',
        sizeBytes: buf.byteLength,
      });
      expect(handle.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should auto-generate a fileId when not provided', async () => {
      await driver.initialize();
      const handle = await driver.write('user-1', 'note.md', Buffer.from('notes'), 'text/markdown');
      expect(handle.fileId).toBeTruthy();
      expect(typeof handle.fileId).toBe('string');
    });

    it('should accept a caller-supplied fileId', async () => {
      await driver.initialize();
      const customId = 'my-custom-file-id';
      const handle = await driver.write('user-1', 'note.md', Buffer.from('notes'), 'text/markdown', customId);
      expect(handle.fileId).toBe(customId);
    });

    it('should overwrite bytes when writing a new version with same fileId and objectName', async () => {
      await driver.initialize();
      await driver.write('user-1', 'note.md', Buffer.from('v1'), 'text/markdown', 'file-a');
      await driver.write('user-1', 'note.md', Buffer.from('v2 updated content'), 'text/markdown', 'file-a');

      const result = await driver.read('file-a', 'note.md');
      expect(result.buffer.toString()).toBe('v2 updated content');
    });
  });

  // ── Read ─────────────────────────────────────────────────────────────────

  describe('read', () => {
    it('should return the full buffer on a successful read', async () => {
      await driver.initialize();
      const buf = Buffer.from('readable content');
      const handle = await driver.write('user-1', 'data.csv', buf, 'text/csv');

      const result = await driver.read(handle.fileId, 'data.csv');
      expect(result.buffer).toEqual(buf);
      expect(result.metadata.fileId).toBe(handle.fileId);
    });

    it('should throw NOT_FOUND when reading a non-existent object', async () => {
      await driver.initialize();
      const promise = driver.read('nonexistent', 'missing.txt');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });

    it('should support offset-based slicing', async () => {
      await driver.initialize();
      const buf = Buffer.from('0123456789');
      const handle = await driver.write('user-1', 'slice.txt', buf, 'text/plain');

      const result = await driver.read(handle.fileId, 'slice.txt', { offset: 3 });
      expect(result.buffer.toString()).toBe('3456789');
    });

    it('should support limit-based slicing', async () => {
      await driver.initialize();
      const buf = Buffer.from('abcdefghij');
      const handle = await driver.write('user-1', 'slice.txt', buf, 'text/plain');

      const result = await driver.read(handle.fileId, 'slice.txt', { limit: 4 });
      expect(result.buffer.toString()).toBe('abcd');
    });

    it('should support offset + limit together', async () => {
      await driver.initialize();
      const buf = Buffer.from('0123456789');
      const handle = await driver.write('user-1', 'slice.txt', buf, 'text/plain');

      const result = await driver.read(handle.fileId, 'slice.txt', { offset: 2, limit: 3 });
      expect(result.buffer.toString()).toBe('234');
    });

    it('should handle offset beyond buffer length gracefully', async () => {
      await driver.initialize();
      const buf = Buffer.from('hi');
      const handle = await driver.write('user-1', 'short.txt', buf, 'text/plain');

      const result = await driver.read(handle.fileId, 'short.txt', { offset: 100 });
      expect(result.buffer.byteLength).toBe(0);
    });

    it('should return metadata alongside the buffer', async () => {
      await driver.initialize();
      const buf = Buffer.from('meta test');
      const handle = await driver.write('user-1', 'meta.txt', buf, 'text/plain');

      const result = await driver.read(handle.fileId, 'meta.txt');
      expect(result.metadata).toMatchObject({
        fileId: handle.fileId,
        objectName: 'meta.txt',
        userId: 'user-1',
        mimeType: 'text/plain',
        sizeBytes: buf.byteLength,
      });
    });
  });

  // ── Metadata ─────────────────────────────────────────────────────────────

  describe('getMetadata', () => {
    it('should return metadata for a stored object', async () => {
      await driver.initialize();
      const buf = Buffer.from('metadata test');
      const handle = await driver.write('user-2', 'info.json', buf, 'application/json');

      const meta = await driver.getMetadata(handle.fileId, 'info.json');
      expect(meta).toMatchObject({
        fileId: handle.fileId,
        objectName: 'info.json',
        userId: 'user-2',
        mimeType: 'application/json',
        sizeBytes: buf.byteLength,
      });
      expect(meta.createdAt).toBeTruthy();
      expect(meta.updatedAt).toBeTruthy();
    });

    it('should throw NOT_FOUND for a non-existent object', async () => {
      await driver.initialize();
      const promise = driver.getMetadata('ghost', 'nowhere.txt');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });
  });

  // ── List ─────────────────────────────────────────────────────────────────

  describe('listFiles', () => {
    it('should return all files when no filter is provided', async () => {
      await driver.initialize();
      await driver.write('user-1', 'a.txt', Buffer.from('a'), 'text/plain');
      await driver.write('user-1', 'b.pdf', Buffer.from('b'), 'application/pdf');
      await driver.write('user-2', 'c.txt', Buffer.from('c'), 'text/plain');

      const result = await driver.listFiles();
      expect(result.items).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by userId', async () => {
      await driver.initialize();
      await driver.write('user-1', 'a.txt', Buffer.from('a'), 'text/plain');
      await driver.write('user-2', 'b.txt', Buffer.from('b'), 'text/plain');

      const result = await driver.listFiles({ userId: 'user-1' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe('user-1');
    });

    it('should filter by mimeTypePrefix', async () => {
      await driver.initialize();
      await driver.write('user-1', 'a.txt', Buffer.from('a'), 'text/plain');
      await driver.write('user-1', 'b.pdf', Buffer.from('b'), 'application/pdf');
      await driver.write('user-1', 'c.csv', Buffer.from('c'), 'text/csv');

      const result = await driver.listFiles({ mimeTypePrefix: 'text/' });
      expect(result.items).toHaveLength(2);
    });

    it('should respect the limit parameter', async () => {
      await driver.initialize();
      await driver.write('user-1', 'a.txt', Buffer.from('a'), 'text/plain');
      await driver.write('user-1', 'b.txt', Buffer.from('b'), 'text/plain');
      await driver.write('user-1', 'c.txt', Buffer.from('c'), 'text/plain');

      const result = await driver.listFiles({ limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should return only the current version per fileId', async () => {
      await driver.initialize();
      await driver.write('user-1', 'note.md', Buffer.from('v1'), 'text/markdown', 'file-x');
      await driver.write('user-1', 'note.md', Buffer.from('v2'), 'text/markdown', 'file-x');

      const result = await driver.listFiles();
      expect(result.items).toHaveLength(1);
    });
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete an existing object', async () => {
      await driver.initialize();
      const handle = await driver.write('user-1', 'remove.txt', Buffer.from('temp'), 'text/plain');

      await driver.delete(handle.fileId, 'remove.txt');

      const promise = driver.read(handle.fileId, 'remove.txt');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when deleting a non-existent object', async () => {
      await driver.initialize();
      const promise = driver.delete('ghost', 'nowhere.txt');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });

    it('should not affect other objects when deleting one', async () => {
      await driver.initialize();
      const h1 = await driver.write('user-1', 'keep.txt', Buffer.from('keep'), 'text/plain');
      const h2 = await driver.write('user-1', 'remove.txt', Buffer.from('temp'), 'text/plain');

      await driver.delete(h2.fileId, 'remove.txt');

      const result = await driver.read(h1.fileId, 'keep.txt');
      expect(result.buffer.toString()).toBe('keep');
    });
  });

  // ── Copy ─────────────────────────────────────────────────────────────────

  describe('copy', () => {
    it('should copy an object to a new name', async () => {
      await driver.initialize();
      const buf = Buffer.from('copyable content');
      const handle = await driver.write('user-1', 'original.txt', buf, 'text/plain');

      const copy = await driver.copy(handle.fileId, 'original.txt', 'duplicate.txt');

      expect(copy.handle.objectName).toBe('duplicate.txt');
      expect(copy.handle.fileId).toBe(handle.fileId);
      expect(copy.isSameObject).toBe(false);

      // Verify the copy is readable
      const result = await driver.read(handle.fileId, 'duplicate.txt');
      expect(result.buffer).toEqual(buf);
    });

    it('should throw NOT_FOUND when copying a non-existent source', async () => {
      await driver.initialize();
      const promise = driver.copy('ghost', 'missing.txt', 'target.txt');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });

    it('should report isSameObject when source and target names match', async () => {
      await driver.initialize();
      const handle = await driver.write('user-1', 'same.txt', Buffer.from('same'), 'text/plain');

      const copy = await driver.copy(handle.fileId, 'same.txt', 'same.txt');
      expect(copy.isSameObject).toBe(true);
    });
  });

  // ── Version ──────────────────────────────────────────────────────────────

  describe('listVersions', () => {
    it('should return versions newest first', async () => {
      await driver.initialize();
      const h1 = await driver.write('user-1', 'versioned.txt', Buffer.from('v1'), 'text/plain', 'file-v');
      await new Promise((r) => setTimeout(r, 10));
      const h2 = await driver.write('user-1', 'versioned.txt', Buffer.from('v2'), 'text/plain', 'file-v');
      await new Promise((r) => setTimeout(r, 10));
      const h3 = await driver.write('user-1', 'versioned.txt', Buffer.from('v3'), 'text/plain', 'file-v');

      const versions = await driver.listVersions('file-v');
      expect(versions).toHaveLength(3);
      expect(versions[0].isCurrent).toBe(true);
      expect(versions[0].objectName).toBe('versioned.txt');
      // Latest version should have the latest content
      const latest = await driver.read('file-v', 'versioned.txt');
      expect(latest.buffer.toString()).toBe('v3');
    });

    it('should return empty array for a non-existent fileId', async () => {
      await driver.initialize();
      const versions = await driver.listVersions('nonexistent');
      expect(versions).toHaveLength(0);
    });

    it('should return a single version for a file written once', async () => {
      await driver.initialize();
      await driver.write('user-1', 'once.txt', Buffer.from('once'), 'text/plain', 'file-o');

      const versions = await driver.listVersions('file-o');
      expect(versions).toHaveLength(1);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return the current version', async () => {
      await driver.initialize();
      await driver.write('user-1', 'cv.txt', Buffer.from('cv1'), 'text/plain', 'file-cv');
      await driver.write('user-1', 'cv.txt', Buffer.from('cv2'), 'text/plain', 'file-cv');

      const current = await driver.getCurrentVersion('file-cv');
      expect(current.isCurrent).toBe(true);
    });

    it('should throw NOT_FOUND for a non-existent fileId', async () => {
      await driver.initialize();
      const promise = driver.getCurrentVersion('no-such-file');
      await expect(promise).rejects.toThrow('NOT_FOUND');
    });
  });

  // ── Cross-operation integration ──────────────────────────────────────────

  describe('integration', () => {
    it('should support a full write-read-delete lifecycle', async () => {
      await driver.initialize();

      const buf = Buffer.from('full lifecycle test');
      const handle: StorageHandle = await driver.write('user-1', 'lifecycle.md', buf, 'text/markdown', 'lc-file');

      // Write
      expect(handle.fileId).toBe('lc-file');

      // Read
      const readResult = await driver.read('lc-file', 'lifecycle.md');
      expect(readResult.buffer).toEqual(buf);

      // Metadata
      const meta = await driver.getMetadata('lc-file', 'lifecycle.md');
      expect(meta.objectName).toBe('lifecycle.md');

      // List
      const listed = await driver.listFiles({ userId: 'user-1' });
      expect(listed.items.some((i) => i.fileId === 'lc-file')).toBe(true);

      // Versions
      const vers = await driver.listVersions('lc-file');
      expect(vers).toHaveLength(1);

      // Delete
      await driver.delete('lc-file', 'lifecycle.md');

      // Verify deletion
      const afterDelete = driver.read('lc-file', 'lifecycle.md');
      await expect(afterDelete).rejects.toThrow('NOT_FOUND');
    });

    it('should handle multiple users with isolated views', async () => {
      await driver.initialize();

      await driver.write('alice', 'shared.txt', Buffer.from('alice data'), 'text/plain', 'shared-file');
      await driver.write('bob', 'shared.txt', Buffer.from('bob data'), 'text/plain', 'bob-file');

      const aliceFiles = await driver.listFiles({ userId: 'alice' });
      expect(aliceFiles.items).toHaveLength(1);
      expect(aliceFiles.items[0].fileId).toBe('shared-file');

      const bobFiles = await driver.listFiles({ userId: 'bob' });
      expect(bobFiles.items).toHaveLength(1);
      expect(bobFiles.items[0].fileId).toBe('bob-file');
    });
  });
});
