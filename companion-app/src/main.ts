import { app, Tray, Menu, nativeImage, shell, type Tray as TrayType } from 'electron';
import type { Server } from 'node:http';
import { createServer, PORT } from './server';
import { createTrayIconBuffer } from './icon';
import { getUserId } from './userid';
import { getEditorPreference, setEditorPreference } from './settings';
import type { EditorPreference } from './settings';
import { checkDocker } from './docker';
import type { DockerStatus } from './types';

// Suppress EPIPE on stdout/stderr — common when Electron is launched from a
// terminal that closes its read-end while the process is still writing.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code !== 'EPIPE') throw err;
  });
}

let tray: TrayType | null = null;
let server: Server | null = null;
let lastDockerStatus: TrayDockerStatus = 'checking';

type TrayDockerStatus = DockerStatus | 'checking';

const EDITOR_LABELS: Record<EditorPreference, string> = {
  vscode: 'VS Code',
  cursor: 'Cursor',
};

// Single instance lock — prevents multiple companion apps running side by side
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.whenReady().then(async () => {
  // Hide from taskbar / dock — this is a tray-only app
  if (process.platform === 'darwin') app.dock.hide();
  app.setAppUserModelId('ch.orif.workshop-companion');

  // Start HTTP server
  server = createServer();

  // Build tray
  const iconBuf = createTrayIconBuffer();
  const icon = nativeImage.createFromBuffer(iconBuf);
  tray = new Tray(icon);
  tray.setToolTip('Workshop ORIF Companion');

  buildTrayMenu('checking');
  tray.on('click', () => tray?.popUpContextMenu());

  // Initial Docker status check, then rebuild menu
  const dockerStatus = await checkDocker();
  buildTrayMenu(dockerStatus);

  // Refresh Docker status every 30 seconds
  setInterval(async () => {
    const status = await checkDocker();
    buildTrayMenu(status);
  }, 30_000);
});

function buildTrayMenu(dockerStatus: TrayDockerStatus): void {
  lastDockerStatus = dockerStatus;

  const editorPreference = (() => {
    try { return getEditorPreference(); } catch { return 'vscode' as EditorPreference; }
  })();

  const dockerLabel = dockerStatus === 'running'
    ? 'Docker : actif ✓'
    : dockerStatus === 'stopped'
    ? 'Docker : arrêté ✗'
    : 'Docker : vérification…';

  const userId = (() => {
    try { return getUserId(); } catch { return '—'; }
  })();

  const menu = Menu.buildFromTemplate([
    { label: 'Workshop ORIF Companion', enabled: false },
    { label: `v0.1.0  ·  port ${PORT}`, enabled: false },
    { type: 'separator' },
    { label: dockerLabel, enabled: false },
    { label: `ID: ${userId.slice(0, 8)}…`, enabled: false },
    { type: 'separator' },
    {
      label: 'Éditeur',
      submenu: [
        {
          label: 'VS Code',
          type: 'radio',
          checked: editorPreference === 'vscode',
          click: () => {
            setEditorPreference('vscode');
            buildTrayMenu(lastDockerStatus);
          },
        },
        {
          label: 'Cursor',
          type: 'radio',
          checked: editorPreference === 'cursor',
          click: () => {
            setEditorPreference('cursor');
            buildTrayMenu(lastDockerStatus);
          },
        },
      ],
    },
    { label: `Éditeur actuel : ${EDITOR_LABELS[editorPreference]}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Ouvrir l\'application web',
      click: () => shell.openExternal('http://localhost:5173'),
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        if (server) server.close();
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(menu);
}

// Keep app alive even when all windows are closed (no windows exist anyway)
app.on('window-all-closed', () => {});
