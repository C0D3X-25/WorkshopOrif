import path from 'node:path';
import fs from 'node:fs';
import { BASE_DIR } from './userid';
import type { FsLike } from './userid';

export type EditorPreference = 'vscode' | 'cursor';

const DEFAULT_EDITOR: EditorPreference = 'vscode';

export interface Settings {
  editor: EditorPreference;
}

export function parseSettings(raw: string): Settings {
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed.editor === 'vscode' || parsed.editor === 'cursor') {
      return { editor: parsed.editor };
    }
  } catch {
    // fall through to default
  }
  return { editor: DEFAULT_EDITOR };
}

/**
 * Factory that creates a settings store backed by the given fs and directory.
 * Accepts injectable fs and baseDirPath for testability.
 */
export function makeSettingsStore(fsModule: FsLike, baseDirPath: string) {
  const settingsFile = path.join(baseDirPath, 'settings.json');
  let cached: Settings | null = null;

  function readSettings(): Settings {
    if (cached) return cached;

    fsModule.mkdirSync(baseDirPath, { recursive: true });

    if (fsModule.existsSync(settingsFile)) {
      cached = parseSettings(fsModule.readFileSync(settingsFile, 'utf8'));
    } else {
      cached = { editor: DEFAULT_EDITOR };
    }

    return cached;
  }

  function getEditorPreference(): EditorPreference {
    return readSettings().editor;
  }

  function setEditorPreference(editor: EditorPreference): void {
    cached = { editor };
    fsModule.mkdirSync(baseDirPath, { recursive: true });
    fsModule.writeFileSync(settingsFile, JSON.stringify({ editor }, null, 2), 'utf8');
  }

  return { getEditorPreference, setEditorPreference };
}

const defaultStore = makeSettingsStore(fs, BASE_DIR);
export const getEditorPreference = defaultStore.getEditorPreference;
export const setEditorPreference = defaultStore.setEditorPreference;
