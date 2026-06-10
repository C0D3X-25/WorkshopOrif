import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSettingsStore, parseSettings } from '../src/settings';
import type { FsLike } from '../src/userid';

describe('parseSettings', () => {
  test('defaults to vscode for invalid JSON', () => {
    assert.deepEqual(parseSettings('not json'), { editor: 'vscode' });
  });

  test('defaults to vscode for unknown editor value', () => {
    assert.deepEqual(parseSettings('{"editor":"neovim"}'), { editor: 'vscode' });
  });

  test('accepts vscode and cursor', () => {
    assert.deepEqual(parseSettings('{"editor":"vscode"}'), { editor: 'vscode' });
    assert.deepEqual(parseSettings('{"editor":"cursor"}'), { editor: 'cursor' });
  });
});

describe('settings store', () => {
  test('defaults to vscode when settings file is missing', () => {
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: () => false,
      readFileSync: () => { throw new Error('should not read'); },
      writeFileSync: () => { throw new Error('should not write'); },
    };

    const store = makeSettingsStore(mockFs, '/fake/dir');
    assert.equal(store.getEditorPreference(), 'vscode');
  });

  test('reads persisted editor preference', () => {
    const settingsPath = path.join('/fake/dir', 'settings.json');
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: (p) => p === settingsPath,
      readFileSync: () => '{"editor":"cursor"}',
      writeFileSync: () => {},
    };

    const store = makeSettingsStore(mockFs, '/fake/dir');
    assert.equal(store.getEditorPreference(), 'cursor');
  });

  test('persists editor preference to disk', () => {
    const written: Record<string, string> = {};
    const mockFs: FsLike = {
      mkdirSync: () => {},
      existsSync: () => false,
      readFileSync: () => '',
      writeFileSync: (p, data) => { written[p] = data; },
    };

    const store = makeSettingsStore(mockFs, '/fake/dir');
    store.setEditorPreference('cursor');

    assert.equal(
      written[path.join('/fake/dir', 'settings.json')],
      JSON.stringify({ editor: 'cursor' }, null, 2),
    );
    assert.equal(store.getEditorPreference(), 'cursor');
  });
});
