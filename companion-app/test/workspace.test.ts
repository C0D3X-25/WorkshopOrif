import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCloseEditorCommand,
  buildDevcontainerJson,
  editorLaunchCandidates,
  makeEditorLauncher,
  makeWorkspace,
  type FsLike,
} from '../src/workspace';

// ── buildDevcontainerJson (pure) ─────────────────────────────────────────────

describe('buildDevcontainerJson', () => {
  test('sets name and image', () => {
    const dc = buildDevcontainerJson('ws1', { image: 'python:3.11-slim' });
    assert.equal(dc.image, 'python:3.11-slim');
    assert.equal(dc.name, 'Workshop ORIF — ws1');
  });

  test('adds VS Code extensions when non-empty', () => {
    const dc = buildDevcontainerJson('ws1', {
      image: 'node:20',
      devContainer: { extensions: ['ms-python.python'] },
    });
    assert.deepEqual(dc.customizations?.vscode.extensions, ['ms-python.python']);
  });

  test('omits customizations when extensions list is empty', () => {
    const dc = buildDevcontainerJson('ws1', {
      image: 'node:20',
      devContainer: { extensions: [] },
    });
    assert.equal(dc.customizations, undefined);
  });

  test('adds postCreateCommand when present', () => {
    const dc = buildDevcontainerJson('ws1', {
      image: 'node:20',
      devContainer: { postCreateCommand: 'pip install openai' },
    });
    assert.equal(dc.postCreateCommand, 'pip install openai');
  });

  test('omits postCreateCommand when absent', () => {
    const dc = buildDevcontainerJson('ws1', { image: 'node:20' });
    assert.equal(dc.postCreateCommand, undefined);
  });

  test('maps ports array to forwardPorts', () => {
    const dc = buildDevcontainerJson('ws1', {
      image: 'node:20',
      ports: [{ containerPort: 3000 }, { containerPort: 5000 }],
    });
    assert.deepEqual(dc.forwardPorts, [3000, 5000]);
  });

  test('adds remoteEnv when non-empty', () => {
    const dc = buildDevcontainerJson('ws1', {
      image: 'node:20',
      env: { OPENAI_API_KEY: 'test-key' },
    });
    assert.deepEqual(dc.remoteEnv, { OPENAI_API_KEY: 'test-key' });
  });

  test('omits remoteEnv when empty object', () => {
    const dc = buildDevcontainerJson('ws1', { image: 'node:20', env: {} });
    assert.equal(dc.remoteEnv, undefined);
  });
});

// ── close editor ─────────────────────────────────────────────────────────────

describe('buildCloseEditorCommand', () => {
  test('targets editor processes whose command line contains the workspace path', () => {
    const wsDir = 'C:\\Users\\learner\\.workshop-orif\\workspaces\\ws1';
    const [cmd, args] = buildCloseEditorCommand(wsDir);
    const script = args.join(' ');
    assert.ok(cmd.length > 0);
    assert.ok(script.includes('workspaces\\ws1') || script.includes('workspaces\\\\ws1'));
    assert.ok(script.includes('Code.exe') || script.includes('Cursor.exe'));
  });
});

describe('closeEditorForWorkspace', () => {
  test('reports closed when the close script stops at least one process', async () => {
    const { closeEditorForWorkspace } = makeEditorLauncher(
      () => {},
      (_cmd, _args, _opts, cb) => cb(null, '2', ''),
    );
    const result = await closeEditorForWorkspace('/tmp/ws1');
    assert.equal(result.closed, true);
  });

  test('reports not closed when no matching editor process is found', async () => {
    const { closeEditorForWorkspace } = makeEditorLauncher(
      () => {},
      (_cmd, _args, _opts, cb) => cb(null, '0', ''),
    );
    const result = await closeEditorForWorkspace('/tmp/ws1');
    assert.equal(result.closed, false);
  });
});

// ── editorLaunchCandidates ───────────────────────────────────────────────────

describe('editorLaunchCandidates', () => {
  const wsDir = '/tmp/ws1';
  const cli = (candidates: [string, string[]][]) =>
    candidates.map(([, args]) => args.find((a) => a !== '/c' && a !== wsDir) ?? args[args.length - 1]);

  test('prefers VS Code when preference is vscode', () => {
    const order = cli(editorLaunchCandidates('vscode', wsDir));
    assert.deepEqual(order, ['code', 'cursor']);
  });

  test('prefers Cursor when preference is cursor', () => {
    const order = cli(editorLaunchCandidates('cursor', wsDir));
    assert.deepEqual(order, ['cursor', 'code']);
  });
});

// ── prepareWorkspace (injectable fs) ─────────────────────────────────────────

interface MockFs extends FsLike {
  _files: Record<string, string>;
  _dirs: Set<string>;
}

function makeMockFs(seed: Record<string, string> = {}): MockFs {
  const files = { ...seed };
  const dirs = new Set<string>();
  return {
    mkdirSync: (p) => { dirs.add(p); },
    existsSync: (p) => Object.prototype.hasOwnProperty.call(files, p) || dirs.has(p),
    writeFileSync: (p, data) => { files[p] = data; },
    rmSync: (p) => {
      for (const key of Object.keys(files)) {
        if (key === p || key.startsWith(`${p}${path.sep}`)) delete files[key];
      }
      dirs.delete(p);
    },
    _files: files,
    _dirs: dirs,
  };
}

describe('prepareWorkspace', () => {
  test('creates workspace directory', () => {
    const mockFs = makeMockFs();
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    prepareWorkspace('ws1', { image: 'node:20' });
    assert.ok(mockFs._dirs.has(path.join('/base', 'workspaces', 'ws1')));
  });

  test('writes starter files to workspace dir', () => {
    const mockFs = makeMockFs();
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    const wsDir = prepareWorkspace('ws1', {
      image: 'node:20',
      workspaceFiles: [{ name: 'main.py', content: 'print("hello")' }],
    });
    assert.equal(mockFs._files[path.join(wsDir, 'main.py')], 'print("hello")');
  });

  test('preserves existing learner files (does not overwrite)', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const mockFs = makeMockFs({ [path.join(wsDir, 'main.py')]: 'learner code' });
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    prepareWorkspace('ws1', {
      image: 'node:20',
      workspaceFiles: [{ name: 'main.py', content: 'original starter' }],
    });
    assert.equal(mockFs._files[path.join(wsDir, 'main.py')], 'learner code');
  });

  test('always overwrites devcontainer.json with latest config', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const dcPath = path.join(wsDir, '.devcontainer', 'devcontainer.json');
    const mockFs = makeMockFs({ [dcPath]: '{"image":"old"}' });
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    prepareWorkspace('ws1', { image: 'python:3.11-slim' });
    const written = JSON.parse(mockFs._files[dcPath]) as { image: string };
    assert.equal(written.image, 'python:3.11-slim');
  });

  test('hasWorkspace is true when devcontainer.json exists', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const dcPath = path.join(wsDir, '.devcontainer', 'devcontainer.json');
    const mockFs = makeMockFs({ [dcPath]: '{}' });
    const { hasWorkspace } = makeWorkspace(mockFs, '/base');
    assert.equal(hasWorkspace('ws1'), true);
  });

  test('hasWorkspace is false when workspace was never prepared', () => {
    const mockFs = makeMockFs();
    const { hasWorkspace } = makeWorkspace(mockFs, '/base');
    assert.equal(hasWorkspace('ws1'), false);
  });

  test('resetWorkspace removes the workshop directory and calls removeContainers', async () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const mainPath = path.join(wsDir, 'main.py');
    const mockFs = makeMockFs({ [mainPath]: 'learner code' });
    mockFs._dirs.add(wsDir);
    const { resetWorkspace } = makeWorkspace(mockFs, '/base');
    let removedPath: string | null = null;

    await resetWorkspace('ws1', async (dir) => { removedPath = dir; });

    assert.equal(removedPath, wsDir);
    assert.equal(mockFs.existsSync(wsDir), false);
    assert.equal(mockFs.existsSync(mainPath), false);
  });
});
