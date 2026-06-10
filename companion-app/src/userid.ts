import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { v4 as uuidv4 } from 'uuid';

export interface FsLike {
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
}

/**
 * Factory that creates a user-ID store backed by the given fs and directory.
 * Accepts injectable fs and baseDirPath for testability.
 */
export function makeUserIdStore(fsModule: FsLike, baseDirPath: string) {
  const idFile = path.join(baseDirPath, 'id');
  let cached: string | null = null;

  function getUserId(): string {
    if (cached) return cached;

    fsModule.mkdirSync(baseDirPath, { recursive: true });

    if (fsModule.existsSync(idFile)) {
      cached = fsModule.readFileSync(idFile, 'utf8').trim();
    } else {
      cached = uuidv4();
      fsModule.writeFileSync(idFile, cached, 'utf8');
    }

    return cached;
  }

  return { getUserId };
}

export const BASE_DIR = path.join(os.homedir(), '.workshop-orif');

const defaultStore = makeUserIdStore(fs, BASE_DIR);
export const getUserId = defaultStore.getUserId;
