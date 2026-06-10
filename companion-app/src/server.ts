import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import type { Server } from 'node:http';
import { checkDocker, startDockerDesktop, pullImage, removeDevContainersForPath } from './docker';
import {
  prepareWorkspace,
  resetWorkspace,
  hasWorkspace,
  openInVSCode,
  closeEditorForWorkspace,
  workshopDir,
} from './workspace';
import type { CloseEditorResult } from './workspace';
import { formatResetError } from './errors';
import { getUserId } from './userid';
import type { DockerStatus, LaunchRequestBody } from './types';

export const PORT = 37428;

const CORS_OPTIONS = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: blocked origin ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
};

export interface LaunchHandlerDeps {
  checkDocker: () => Promise<DockerStatus>;
  startDockerDesktop: () => void;
  pullImage: (image: string, onLine: (line: string) => void) => Promise<void>;
  prepareWorkspace: (workshopId: string, env: LaunchRequestBody) => string;
  openInVSCode: (wsDir: string) => Promise<void>;
}

export interface ResetHandlerDeps {
  workshopDir: (workshopId: string) => string;
  closeEditorForWorkspace: (wsDir: string) => Promise<CloseEditorResult>;
  resetWorkspace: (workshopId: string, removeContainers: (wsDir: string) => Promise<void>) => Promise<void>;
}

export interface StatusHandlerDeps {
  hasWorkspace: (workshopId: string) => boolean;
}

export interface AppDeps extends LaunchHandlerDeps, ResetHandlerDeps, StatusHandlerDeps {
  getUserId: () => string;
}

// ── SSE helper ────────────────────────────────────────────────────────────────

function sseEvent(res: Response, phase: string, message?: string): void {
  if (res.writableEnded) return;
  const payload = JSON.stringify({ phase, ...(message ? { message } : {}) });
  try {
    res.write(`data: ${payload}\n\n`);
    // Flush explicitly — required when compression middleware is present,
    // and harmless otherwise.
    if (typeof (res as Response & { flush?: () => void }).flush === 'function') {
      (res as Response & { flush: () => void }).flush();
    }
  } catch {
    // client already disconnected — ignore
  }
}

// ── Launch handler (injectable deps for testability) ──────────────────────────

/**
 * Returns an Express request handler for POST /containers/launch.
 * All external operations are injected so they can be replaced in tests.
 */
export function createLaunchHandler(deps: LaunchHandlerDeps) {
  const {
    checkDocker: checkDockerFn,
    startDockerDesktop: startDockerDesktopFn,
    pullImage: pullImageFn,
    prepareWorkspace: prepareWorkspaceFn,
    openInVSCode: openInVSCodeFn,
  } = deps;

  return async function handleLaunch(req: Request, res: Response): Promise<void> {
    const { workshopId, image, devContainer, workspaceFiles, ports, env } =
      (req.body ?? {}) as LaunchRequestBody;

    if (!workshopId || !image) {
      res.status(400).json({ error: 'workshopId and image are required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Disable Nagle's algorithm so each res.write() triggers an immediate TCP send.
    // Without this, small SSE frames are batched and the browser never sees them
    // until the stream ends.
    res.socket?.setNoDelay(true);

    // Absorb socket-level EPIPE — a disconnected client must not crash the process.
    // (res.write throws asynchronously via the socket's 'error' event, not synchronously.)
    res.socket?.on('error', () => {});

    // Detect a real client disconnect — NOT req 'close', which also fires once the
    // POST body has been fully read (would suppress every SSE frame).
    let clientGone = false;
    const markClientGone = () => { clientGone = true; };
    req.on('aborted', markClientGone);
    res.on('close', () => {
      if (!res.writableFinished) markClientGone();
    });

    const send = (phase: string, message?: string) => {
      if (!clientGone) sseEvent(res, phase, message);
    };

    try {
      // Step 1 — verify Docker
      const dockerStatus = await checkDockerFn();
      if (dockerStatus === 'stopped') {
        startDockerDesktopFn();
        send('error', "Docker Desktop n'est pas démarré. Il va s'ouvrir — attendez qu'il soit prêt, puis réessayez.");
        res.end();
        return;
      }

      // Step 2 — pull image
      send('pulling');
      if (clientGone) {
        res.end();
        return;
      }

      try {
        await pullImageFn(image, (line) => send('pulling', line));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send('error', `Impossible de télécharger l'image : ${message}`);
        res.end();
        return;
      }

      // Step 3 — prepare workspace
      send('starting');
      if (clientGone) {
        res.end();
        return;
      }

      let wsDir: string;
      try {
        wsDir = prepareWorkspaceFn(workshopId, { image, devContainer, workspaceFiles, ports, env });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send('error', `Impossible de préparer l'espace de travail : ${message}`);
        res.end();
        return;
      }

      // Step 4 — open editor
      if (clientGone) {
        res.end();
        return;
      }

      try {
        await openInVSCodeFn(wsDir);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send('error',
          `VS Code n'a pas pu s'ouvrir : ${message}. ` +
          `Ouvrez manuellement le dossier : ${wsDir}`);
        res.end();
        return;
      }

      send('ready');
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      send('error', message);
      res.end();
    }
  };
}

// ── Reset handler ─────────────────────────────────────────────────────────────

export function createResetHandler(deps: ResetHandlerDeps) {
  const {
    workshopDir: workshopDirFn,
    closeEditorForWorkspace: closeEditorFn,
    resetWorkspace: resetWorkspaceFn,
  } = deps;

  return async function handleReset(req: Request, res: Response): Promise<void> {
    const { workshopId } = (req.body ?? {}) as { workshopId?: string };

    if (!workshopId) {
      res.status(400).json({ error: 'workshopId is required' });
      return;
    }

    try {
      const wsDir = workshopDirFn(workshopId);
      const { closed: editorClosed } = await closeEditorFn(wsDir);
      await resetWorkspaceFn(workshopId, removeDevContainersForPath);
      res.json({ ok: true, editorClosed });
    } catch (err) {
      console.error('[reset]', err);
      res.status(500).json({ error: formatResetError(err) });
    }
  };
}

// ── Status handler ────────────────────────────────────────────────────────────

export function createStatusHandler(deps: StatusHandlerDeps) {
  const { hasWorkspace: hasWorkspaceFn } = deps;

  return function handleStatus(req: Request, res: Response): void {
    const workshopId = req.params.workshopId as string | undefined;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId is required' });
      return;
    }

    res.json({ ready: hasWorkspaceFn(workshopId) });
  };
}

// ── App factory ───────────────────────────────────────────────────────────────

export function createApp(deps: Partial<AppDeps> = {}): Express {
  const resolved: AppDeps = {
    checkDocker,
    startDockerDesktop,
    pullImage,
    prepareWorkspace,
    resetWorkspace,
    hasWorkspace,
    openInVSCode,
    closeEditorForWorkspace,
    workshopDir,
    getUserId,
    ...deps,
  };

  const app = express();
  app.use(cors(CORS_OPTIONS));
  app.options('*', cors(CORS_OPTIONS));
  app.use(express.json({ limit: '1mb' }));

  // Liveness probe only — Docker is checked during /containers/launch.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', userId: resolved.getUserId(), version: '0.1.0' });
  });

  app.get('/containers/:workshopId/status', createStatusHandler(resolved));
  app.post('/containers/launch', createLaunchHandler(resolved));
  app.post('/containers/reset', createResetHandler(resolved));

  return app;
}

export function createServer(deps?: Partial<AppDeps>): Server {
  const app = createApp(deps);
  return app.listen(PORT, '127.0.0.1', () => {
    console.log(`[companion] HTTP API listening on http://127.0.0.1:${PORT}`);
  });
}
