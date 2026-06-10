import { execFile as defaultExecFile, spawn as defaultSpawn } from 'node:child_process';
import type { DockerStatus } from './types';

/**
 * Creates Docker operations backed by the given execFileFn and spawnFn.
 * Accepts injectable child_process functions for testability.
 */
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

  function pullImage(image: string, onLine: (line: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawnFn('docker', ['pull', image]);

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
        else reject(new Error(`docker pull exited with code ${code}`));
      });

      proc.on('error', reject);
    });
  }

  function removeDevContainersForPath(localFolder: string): Promise<void> {
    return new Promise((resolve) => {
      execFileFn(
        'docker',
        ['ps', '-aq', '--filter', `label=devcontainer.local_folder=${localFolder}`],
        { encoding: 'utf8' },
        (err, stdout) => {
          if (err) {
            resolve();
            return;
          }

          const ids = stdout.trim().split('\n').filter(Boolean);
          if (ids.length === 0) {
            resolve();
            return;
          }

          execFileFn('docker', ['rm', '-f', ...ids], {}, () => resolve());
        },
      );
    });
  }

  return { checkDocker, startDockerDesktop, pullImage, removeDevContainersForPath };
}

const defaultOps = makeDockerOps(defaultExecFile, defaultSpawn);

export const checkDocker = defaultOps.checkDocker;
export const startDockerDesktop = defaultOps.startDockerDesktop;
export const pullImage = defaultOps.pullImage;
export const removeDevContainersForPath = defaultOps.removeDevContainersForPath;
