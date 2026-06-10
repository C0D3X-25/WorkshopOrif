import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { BASE_DIR } from './userid';
import { getEditorPreference } from './settings';
import type { EditorPreference } from './settings';
import type { WorkshopEnv } from './types';

export interface DevcontainerJson {
  name: string;
  image: string;
  customizations?: { vscode: { extensions: string[] } };
  postCreateCommand?: string;
  forwardPorts?: number[];
  remoteEnv?: Record<string, string>;
}

export interface FsLike {
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  existsSync(path: string): boolean;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

type ExecFileFn = (
  file: string,
  args: readonly string[],
  callback: (error: Error | null) => void,
) => void;

type ExecFileWithOutputFn = (
  file: string,
  args: readonly string[],
  options: { encoding: 'utf8' },
  callback: (error: Error | null, stdout: string, stderr: string) => void,
) => void;

export interface CloseEditorResult {
  closed: boolean;
}

// ── Pure builder ──────────────────────────────────────────────────────────────

export function buildDevcontainerJson(workshopId: string, env: WorkshopEnv): DevcontainerJson {
  const dc: DevcontainerJson = {
    name: `Workshop ORIF — ${workshopId}`,
    image: env.image,
  };

  const extensions = env.devContainer?.extensions ?? [];
  if (extensions.length > 0) {
    dc.customizations = { vscode: { extensions } };
  }

  if (env.devContainer?.postCreateCommand) {
    dc.postCreateCommand = env.devContainer.postCreateCommand;
  }

  if (env.ports && env.ports.length > 0) {
    dc.forwardPorts = env.ports.map((p) => p.containerPort);
  }

  const remoteEnv = env.env ?? {};
  if (Object.keys(remoteEnv).length > 0) {
    dc.remoteEnv = remoteEnv;
  }

  return dc;
}

// ── Injectable factories ──────────────────────────────────────────────────────

/**
 * Creates workspace operations backed by the given fsModule and baseDir.
 * Accepts injectable fs for testability.
 */
export function makeWorkspace(fsModule: FsLike, baseDir: string) {
  function workshopDir(workshopId: string): string {
    return path.join(baseDir, 'workspaces', workshopId);
  }

  function prepareWorkspace(workshopId: string, env: WorkshopEnv): string {
    const wsDir = workshopDir(workshopId);
    fsModule.mkdirSync(wsDir, { recursive: true });

    for (const file of env.workspaceFiles ?? []) {
      if (!file.name) continue;

      if (file.gitUrl) {
        console.warn(`[workspace] git-sourced file skipped (MVP): ${file.gitUrl}`);
        continue;
      }

      if (file.content != null) {
        const dest = path.join(wsDir, file.name);
        fsModule.mkdirSync(path.dirname(dest), { recursive: true });
        if (!fsModule.existsSync(dest)) {
          fsModule.writeFileSync(dest, file.content, 'utf8');
        }
      }
    }

    const dcDir = path.join(wsDir, '.devcontainer');
    fsModule.mkdirSync(dcDir, { recursive: true });

    const devcontainer = buildDevcontainerJson(workshopId, env);
    fsModule.writeFileSync(
      path.join(dcDir, 'devcontainer.json'),
      JSON.stringify(devcontainer, null, 2),
      'utf8',
    );

    return wsDir;
  }

  function hasWorkspace(workshopId: string): boolean {
    const dcPath = path.join(workshopDir(workshopId), '.devcontainer', 'devcontainer.json');
    return fsModule.existsSync(dcPath);
  }

  async function resetWorkspace(
    workshopId: string,
    removeContainers: (wsDir: string) => Promise<void>,
  ): Promise<void> {
    const wsDir = workshopDir(workshopId);
    if (!fsModule.existsSync(wsDir)) return;

    await removeContainers(wsDir);
    fsModule.rmSync(wsDir, { recursive: true, force: true });
  }

  return { prepareWorkspace, resetWorkspace, hasWorkspace, workshopDir };
}

export function buildCloseEditorCommand(wsDir: string): [string, string[]] {
  if (process.platform === 'win32') {
    const escaped = wsDir.replace(/'/g, "''");
    const script = [
      `$ws = '${escaped}'`,
      '$killed = 0',
      'Get-CimInstance Win32_Process |',
      "Where-Object { ($_.Name -in @('Code.exe','Cursor.exe')) -and ($_.CommandLine -like \"*$ws*\") } |",
      'ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $killed++ }',
      'Write-Output $killed',
    ].join(' ');
    return ['powershell', ['-NoProfile', '-Command', script]];
  }

  if (process.platform === 'darwin') {
    const escaped = wsDir.replace(/'/g, "'\\''");
    const script = [
      `ws='${escaped}'`,
      'killed=0',
      'for pid in $(pgrep -x Code 2>/dev/null; pgrep -x Cursor 2>/dev/null); do',
      '  if ps -p "$pid" -o command= | grep -F "$ws" >/dev/null; then',
      '    kill "$pid" 2>/dev/null && killed=$((killed+1))',
      '  fi',
      'done',
      'echo "$killed"',
    ].join('; ');
    return ['bash', ['-lc', script]];
  }

  const escaped = wsDir.replace(/'/g, "'\\''");
  const script = [
    `ws='${escaped}'`,
    'killed=0',
    'for pid in $(pgrep -x code 2>/dev/null; pgrep -x cursor 2>/dev/null); do',
    '  if tr "\\0" " " </proc/"$pid"/cmdline | grep -F "$ws" >/dev/null; then',
    '    kill "$pid" 2>/dev/null && killed=$((killed+1))',
    '  fi',
    'done',
    'echo "$killed"',
  ].join('; ');
  return ['bash', ['-lc', script]];
}

export function editorLaunchCandidates(
  preference: EditorPreference,
  wsDir: string,
): [string, string[]][] {
  const make = (cli: 'code' | 'cursor'): [string, string[]] =>
    process.platform === 'win32'
      ? ['cmd', ['/c', cli, wsDir]]
      : [cli, [wsDir]];

  const primary = preference === 'vscode' ? 'code' : 'cursor';
  const fallback = preference === 'vscode' ? 'cursor' : 'code';
  return [make(primary), make(fallback)];
}

/**
 * Creates an editor launcher backed by the given execFileFn.
 * Accepts injectable execFile and preference getter for testability.
 */
export function makeEditorLauncher(
  execFileFn: ExecFileFn,
  execFileWithOutputFn?: ExecFileWithOutputFn,
  getPreference: () => EditorPreference = getEditorPreference,
) {
  function tryNext(candidates: [string, string[]][]): Promise<void> {
    if (candidates.length === 0) {
      return Promise.reject(new Error(
        'Ni cursor ni code n\'ont été trouvés dans le PATH. ' +
        'Installez Cursor (cursor.sh) ou VS Code avec la commande shell activée.',
      ));
    }
    const [[cmd, args], ...rest] = candidates;
    return new Promise((resolve, reject) => {
      execFileFn(cmd, args, (err) => {
        if (err) tryNext(rest).then(resolve, reject);
        else resolve();
      });
    });
  }

  function openInVSCode(wsDir: string): Promise<void> {
    return tryNext(editorLaunchCandidates(getPreference(), wsDir));
  }

  function closeEditorForWorkspace(wsDir: string): Promise<CloseEditorResult> {
    if (!execFileWithOutputFn) {
      return Promise.resolve({ closed: false });
    }

    const [cmd, args] = buildCloseEditorCommand(wsDir);
    return new Promise((resolve) => {
      execFileWithOutputFn(cmd, args, { encoding: 'utf8' }, (err, stdout) => {
        if (err) {
          resolve({ closed: false });
          return;
        }
        const count = Number.parseInt(stdout.trim(), 10);
        resolve({ closed: Number.isFinite(count) && count > 0 });
      });
    });
  }

  return { openInVSCode, closeEditorForWorkspace };
}

// ── Default instances backed by real fs + child_process ──────────────────────

const defaultExecFileWithOutput: ExecFileWithOutputFn = (file, args, options, callback) => {
  execFile(file, args, options, callback);
};

const defaultWorkspace = makeWorkspace(fs, BASE_DIR);
const defaultEditor = makeEditorLauncher(execFile, defaultExecFileWithOutput);

export const prepareWorkspace = defaultWorkspace.prepareWorkspace;
export const resetWorkspace = defaultWorkspace.resetWorkspace;
export const hasWorkspace = defaultWorkspace.hasWorkspace;
export const workshopDir = defaultWorkspace.workshopDir;
export const openInVSCode = defaultEditor.openInVSCode;
export const closeEditorForWorkspace = defaultEditor.closeEditorForWorkspace;
