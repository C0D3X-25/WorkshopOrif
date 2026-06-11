import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCloseEditorCommand,
  buildDevcontainerJson,
  buildDevContainerFolderUri,
  devContainerLaunchCandidates,
  editorLaunchCandidates,
  makeEditorLauncher,
  makeWorkspace,
  materializeComposeForDevContainer,
  type FsLike,
} from '../src/workspace';

const sampleRuntime = {
  compose: 'services:\n  workshop:\n    image: python:3.11-slim\n',
  devService: 'workshop',
};

describe('buildDevcontainerJson', () => {
  test('references compose file and dev service from exercise runtime', () => {
    const dc = buildDevcontainerJson('ws1', sampleRuntime);
    assert.equal(dc.dockerComposeFile, 'docker-compose.yml');
    assert.equal(dc.service, 'workshop');
    assert.equal(dc.workspaceFolder, '/workspace');
    assert.equal(dc.name, 'Workshop ORIF — ws1');
    assert.equal(dc.overrideCommand, false);
    assert.equal(dc.remoteUser, 'vscode');
    assert.equal(dc.updateRemoteUserUID, 'on');
  });

  test('adds postCreateCommand and python extension when workspace has requirements and .py files', () => {
    const dc = buildDevcontainerJson('ws1', {
      ...sampleRuntime,
      workspaceFiles: [
        { name: 'requirements.txt', content: 'openai\n' },
        { name: 'main.py', content: 'print("hi")\n' },
      ],
    });
    assert.equal(dc.postCreateCommand, 'python3 -m pip install -q -r requirements.txt');
    assert.deepEqual(dc.customizations?.vscode.extensions, ['ms-python.python']);
  });
});

describe('materializeComposeForDevContainer', () => {
  test('rewrites workspace-relative volume for .devcontainer compose file', () => {
    const compose = 'services:\n  workshop:\n    volumes:\n      - .:/workspace\n';
    assert.match(materializeComposeForDevContainer(compose), /- \.\.:\/workspace/);
  });
});

describe('buildDevContainerFolderUri', () => {
  test('builds a dev-container folder URI for full-auto IDE attach', () => {
    const wsDir = '/base/workspaces/ws1';
    const uri = buildDevContainerFolderUri(wsDir);
    const expectedHex = Buffer.from(wsDir).toString('hex');
    assert.equal(uri, `vscode-remote://dev-container+${expectedHex}/workspace`);
  });

  test('encodes the workspace folder path, not the devcontainer.json path', () => {
    const wsDir = '/base/workspaces/ws1';
    const uri = buildDevContainerFolderUri(wsDir);
    const wrongHex = Buffer.from(`${wsDir}/.devcontainer/devcontainer.json`).toString('hex');
    assert.ok(!uri.includes(wrongHex), 'URI must not encode the devcontainer.json file path');
  });

  test('uses hex encoding, not base64url', () => {
    const wsDir = '/base/workspaces/ws1';
    const uri = buildDevContainerFolderUri(wsDir);
    const base64urlEncoded = Buffer.from(wsDir).toString('base64url');
    assert.ok(!uri.includes(base64urlEncoded), 'URI must not use base64url encoding');
  });
});

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

describe('devContainerLaunchCandidates', () => {
  const folderUri = 'vscode-remote://dev-container+abc/workspace';

  test('prefers VS Code when preference is vscode', () => {
    const candidates = devContainerLaunchCandidates('vscode', folderUri);
    const clis = candidates.map(([, args]) => args.find((a) => a === 'code' || a === 'cursor'));
    assert.deepEqual(clis, ['code', 'cursor']);
  });

  test('passes folder-uri to the editor CLI', () => {
    const candidates = devContainerLaunchCandidates('vscode', folderUri);
    assert.ok(candidates[0][1].includes('--folder-uri'));
    assert.ok(candidates[0][1].includes(folderUri));
  });
});

describe('editorLaunchCandidates', () => {
  const wsDir = '/tmp/ws1';
  const cli = (candidates: [string, string[]][]) =>
    candidates.map(([, args]) => args.find((a) => a !== '/c' && a !== wsDir) ?? args[args.length - 1]);

  test('prefers VS Code when preference is vscode', () => {
    const order = cli(editorLaunchCandidates('vscode', wsDir));
    assert.deepEqual(order, ['code', 'cursor']);
  });
});

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
    prepareWorkspace('ws1', sampleRuntime);
    assert.ok(mockFs._dirs.has(path.join('/base', 'workspaces', 'ws1')));
  });

  test('writes docker-compose.yml under .devcontainer', () => {
    const mockFs = makeMockFs();
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    const wsDir = prepareWorkspace('ws1', {
      ...sampleRuntime,
      compose: 'services:\n  workshop:\n    volumes:\n      - .:/workspace\n',
    });
    const composePath = path.join(wsDir, '.devcontainer', 'docker-compose.yml');
    assert.match(mockFs._files[composePath], /- \.\.:\/workspace/);
  });

  test('writes starter files to workspace dir', () => {
    const mockFs = makeMockFs();
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    const wsDir = prepareWorkspace('ws1', {
      ...sampleRuntime,
      workspaceFiles: [{ name: 'main.py', content: 'print("hello")' }],
    });
    assert.equal(mockFs._files[path.join(wsDir, 'main.py')], 'print("hello")');
  });

  test('preserves existing learner files (does not overwrite)', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const mockFs = makeMockFs({ [path.join(wsDir, 'main.py')]: 'learner code' });
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    prepareWorkspace('ws1', {
      ...sampleRuntime,
      workspaceFiles: [{ name: 'main.py', content: 'original starter' }],
    });
    assert.equal(mockFs._files[path.join(wsDir, 'main.py')], 'learner code');
  });

  test('always overwrites devcontainer.json with latest config', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const dcPath = path.join(wsDir, '.devcontainer', 'devcontainer.json');
    const mockFs = makeMockFs({ [dcPath]: '{"service":"old"}' });
    const { prepareWorkspace } = makeWorkspace(mockFs, '/base');
    prepareWorkspace('ws1', sampleRuntime);
    const written = JSON.parse(mockFs._files[dcPath]) as { service: string };
    assert.equal(written.service, 'workshop');
  });

  test('hasWorkspace is true when docker-compose.yml exists', () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const mockFs = makeMockFs({
      [path.join(wsDir, '.devcontainer', 'docker-compose.yml')]: sampleRuntime.compose,
    });
    const { hasWorkspace } = makeWorkspace(mockFs, '/base');
    assert.equal(hasWorkspace('ws1'), true);
  });

  test('hasWorkspace is false when workspace was never prepared', () => {
    const mockFs = makeMockFs();
    const { hasWorkspace } = makeWorkspace(mockFs, '/base');
    assert.equal(hasWorkspace('ws1'), false);
  });

  test('resetWorkspace removes the workshop directory and tears down the stack', async () => {
    const wsDir = path.join('/base', 'workspaces', 'ws1');
    const mainPath = path.join(wsDir, 'main.py');
    const mockFs = makeMockFs({ [mainPath]: 'learner code' });
    mockFs._dirs.add(wsDir);
    const { resetWorkspace } = makeWorkspace(mockFs, '/base');
    let tornDownPath: string | null = null;

    await resetWorkspace('ws1', async (dir) => { tornDownPath = dir; });

    assert.equal(tornDownPath, wsDir);
    assert.equal(mockFs.existsSync(wsDir), false);
    assert.equal(mockFs.existsSync(mainPath), false);
  });
});
