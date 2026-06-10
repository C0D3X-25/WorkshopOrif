import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeUserIdStore, type FsLike } from '../src/userid';

describe('userid', () => {
  test('creates a new UUID on first call and writes it to disk', () => {
    const written: Record<string, string> = {};
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: () => false,
      readFileSync: () => { throw new Error('should not read'); },
      writeFileSync: (p, data) => { written[p] = data; },
    };

    const store = makeUserIdStore(mockFs, '/fake/dir');
    const id = store.getUserId();

    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(written[path.join('/fake/dir', 'id')], id);
  });

  test('returns the same ID on repeated calls without writing again', () => {
    const writes: string[] = [];
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: () => false,
      readFileSync: () => '',
      writeFileSync: (_, data) => writes.push(data),
    };

    const store = makeUserIdStore(mockFs, '/fake/dir');
    const id1 = store.getUserId();
    const id2 = store.getUserId();

    assert.equal(id1, id2);
    assert.equal(writes.length, 1);
  });

  test('reads existing ID from disk on first call', () => {
    const existingId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: () => true,
      readFileSync: () => existingId,
      writeFileSync: () => { throw new Error('should not write existing id'); },
    };

    const store = makeUserIdStore(mockFs, '/fake/dir');
    assert.equal(store.getUserId(), existingId);
  });
});
