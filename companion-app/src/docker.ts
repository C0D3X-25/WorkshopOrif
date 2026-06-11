import { execFile as defaultExecFile, spawn as defaultSpawn } from 'node:child_process';
import type { DockerStatus } from './types';
import { COMPOSE_REL_PATH } from './workspace';

export function makeDockerOps(
  execFileFn: typeof defaultExecFile,
  spawnFn: typeof defaultSpawn,
) {
  function checkDocker(): Promise<DockerStatus> {
    return new Promise((resolve) => {
      execFileFn(
        'docker',
        ['info', '--format', '{{.ServerVersion}}'],
        { timeout: 5000, encoding: 'utf8' },
        (err) => resolve(err ? 'stopped' : 'running'),
      );
    });
  }

  function startDockerDesktop(): void {
    const { platform } = process;
    if (platform === 'win32') {
      execFileFn('cmd', ['/c', 'start', '', 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe']);
    } else if (platform === 'darwin') {
      execFileFn('open', ['-a', 'Docker Desktop']);
    } else {
      execFileFn('systemctl', ['--user', 'start', 'docker-desktop']);
    }
  }

  function composeUp(wsDir: string, onLine: (line: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawnFn(
        'docker',
        ['compose', '-f', COMPOSE_REL_PATH, 'up', '-d', '--remove-orphans'],
        { cwd: wsDir },
      );

      proc.stdout.on('data', (chunk: Buffer | string) => {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) onLine(line.trim());
        }
      });

      proc.stderr.on('data', (chunk: Buffer | string) => {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) onLine(line.trim());
        }
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`docker compose up exited with code ${code}`));
      });

      proc.on('error', reject);
    });
  }

  function composeDown(wsDir: string): Promise<void> {
    return new Promise((resolve) => {
      execFileFn(
        'docker',
        ['compose', '-f', COMPOSE_REL_PATH, 'down', '--remove-orphans'],
        { cwd: wsDir, timeout: 60_000 },
        () => resolve(),
      );
    });
  }

  function removeDevContainersForPath(localFolder: string): Promise<void> {
    return composeDown(localFolder);
  }

  return { checkDocker, startDockerDesktop, composeUp, composeDown, removeDevContainersForPath };
}

const defaultOps = makeDockerOps(defaultExecFile, defaultSpawn);

export const checkDocker = defaultOps.checkDocker;
export const startDockerDesktop = defaultOps.startDockerDesktop;
export const composeUp = defaultOps.composeUp;
export const composeDown = defaultOps.composeDown;
export const removeDevContainersForPath = defaultOps.removeDevContainersForPath;
