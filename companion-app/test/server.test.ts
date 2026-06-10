import { EventEmitter } from 'node:events';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
  createLaunchHandler,
  createResetHandler,
  createStatusHandler,
  type LaunchHandlerDeps,
} from '../src/server';
import type { DockerStatus } from '../src/types';

interface SseEvent {
  phase: string;
  message?: string;
}

interface MockRequest extends EventEmitter {
  body: unknown;
  params: Record<string, string>;
}

interface MockResponse extends EventEmitter {
  socket: EventEmitter & { setNoDelay: () => void };
  writableEnded: boolean;
  writableFinished: boolean;
  setHeader: () => void;
  flushHeaders: () => void;
  write: (chunk: string) => void;
  end: () => void;
  json: (body: unknown) => void;
  status: (code: number) => { json: (body: unknown) => void };
  _statusCode?: number;
  _statusBody?: unknown;
  _events_collected: SseEvent[];
}

const sampleBody = {
  workshopId: 'ws1',
  compose: 'services:\n  workshop:\n    image: python:3.11\n',
  devService: 'workshop',
};

function mockReq(body: unknown, params: Record<string, string> = {}): MockRequest {
  const emitter = new EventEmitter() as MockRequest;
  emitter.body = body;
  emitter.params = params;
  return emitter;
}

function mockRes(): MockResponse {
  const emitter = new EventEmitter() as MockResponse;
  const events: SseEvent[] = [];
  emitter.socket = Object.assign(new EventEmitter(), { setNoDelay: () => {} });
  emitter.writableEnded = false;
  emitter.writableFinished = false;

  emitter.setHeader = () => {};
  emitter.flushHeaders = () => {};
  emitter.write = (chunk) => {
    if (emitter.writableEnded) return;
    const m = chunk.match(/^data: (.+)\n\n$/s);
    if (m) events.push(JSON.parse(m[1]) as SseEvent);
  };
  emitter.end = () => {
    emitter.writableEnded = true;
    emitter.writableFinished = true;
  };
  emitter.json = (body) => {
    emitter._statusBody = body;
  };
  emitter.status = (code) => ({
    json: (body) => {
      emitter._statusCode = code;
      emitter._statusBody = body;
    },
  });

  emitter._events_collected = events;
  return emitter;
}

const noop = () => {};

function defaultDeps(overrides: Partial<LaunchHandlerDeps> = {}): LaunchHandlerDeps {
  return {
    checkDocker: async () => 'running' as DockerStatus,
    startDockerDesktop: noop,
    composeUp: async () => {},
    prepareWorkspace: () => '/tmp/ws1',
    openInVSCode: async () => {},
    ...overrides,
  };
}

describe('launch handler', () => {
  test('rejects with 400 when workshopId is missing', async () => {
    const handler = createLaunchHandler(defaultDeps());
    const req = mockReq({ compose: sampleBody.compose, devService: 'workshop' });
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    assert.equal(res._statusCode, 400);
    assert.equal(
      (res._statusBody as { error?: string })?.error,
      'workshopId, compose, and devService are required',
    );
  });

  test('still streams events after the POST body has been read', async () => {
    const handler = createLaunchHandler(defaultDeps());
    const req = mockReq(sampleBody);
    const res = mockRes();

    req.emit('close');

    await handler(req as unknown as Request, res as unknown as Response);

    const phases = res._events_collected.map((e) => e.phase);
    assert.ok(phases.includes('pulling'), 'must emit pulling after req close');
    assert.ok(phases.includes('ready'), 'must emit ready after req close');
  });

  test('streams starting → pulling → ready on success', async () => {
    const handler = createLaunchHandler(defaultDeps());
    const req = mockReq(sampleBody);
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    const phases = res._events_collected.map((e) => e.phase);
    assert.ok(phases.includes('starting'), 'must emit starting');
    assert.ok(phases.includes('pulling'), 'must emit pulling');
    assert.ok(phases.includes('ready'), 'must emit ready');
    assert.ok(res.writableEnded, 'response must be closed');
  });

  test('streams error phase when Docker is stopped', async () => {
    const handler = createLaunchHandler(defaultDeps({ checkDocker: async () => 'stopped' }));
    const req = mockReq(sampleBody);
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    const phases = res._events_collected.map((e) => e.phase);
    assert.ok(phases.includes('error'), 'must emit error when Docker stopped');
    assert.ok(!phases.includes('ready'), 'must not emit ready');
  });

  test('streams error phase when compose up fails', async () => {
    const handler = createLaunchHandler(defaultDeps({
      composeUp: async () => { throw new Error('compose failed'); },
    }));
    const req = mockReq(sampleBody);
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    const err = res._events_collected.find((e) => e.phase === 'error');
    assert.ok(err, 'must emit error event');
    assert.ok(err?.message?.includes('compose failed'));
  });

  test('does not crash when client disconnects and socket emits EPIPE', async () => {
    let resolveP: () => void = () => {};
    const composeBarrier = new Promise<void>((r) => { resolveP = r; });

    const handler = createLaunchHandler(defaultDeps({
      composeUp: () => composeBarrier,
    }));
    const req = mockReq(sampleBody);
    const res = mockRes();

    const handlerDone = handler(req as unknown as Request, res as unknown as Response);

    req.emit('aborted');
    res.socket.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }));

    resolveP();
    await assert.doesNotReject(handlerDone);
  });
});

describe('status handler', () => {
  test('returns ready true when workspace exists', () => {
    const handler = createStatusHandler({ hasWorkspace: () => true });
    const req = mockReq({}, { workshopId: 'ws1' });
    const res = mockRes();

    handler(req as unknown as Request, res as unknown as Response);

    assert.deepEqual(res._statusBody, { ready: true });
  });

  test('returns ready false when workspace does not exist', () => {
    const handler = createStatusHandler({ hasWorkspace: () => false });
    const req = mockReq({}, { workshopId: 'ws1' });
    const res = mockRes();

    handler(req as unknown as Request, res as unknown as Response);

    assert.deepEqual(res._statusBody, { ready: false });
  });
});

describe('reset handler', () => {
  test('rejects with 400 when workshopId is missing', async () => {
    const handler = createResetHandler({
      workshopDir: (id) => `/tmp/workspaces/${id}`,
      closeEditorForWorkspace: async () => ({ closed: false }),
      resetWorkspace: async () => {},
    });
    const req = mockReq({});
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    assert.equal(res._statusCode, 400);
    assert.equal((res._statusBody as { error?: string })?.error, 'workshopId is required');
  });

  test('returns ok when reset succeeds', async () => {
    let resetId: string | null = null;
    const handler = createResetHandler({
      workshopDir: (id) => `/tmp/workspaces/${id}`,
      closeEditorForWorkspace: async () => ({ closed: false }),
      resetWorkspace: async (workshopId) => { resetId = workshopId; },
    });
    const req = mockReq({ workshopId: 'ws1' });
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    assert.equal(resetId, 'ws1');
    assert.deepEqual(res._statusBody, { ok: true, editorClosed: false });
  });

  test('returns a user-facing message when reset fails because the workspace is locked', async () => {
    const err = Object.assign(new Error("EBUSY: resource busy or locked, rmdir 'C:\\ws'"), {
      code: 'EBUSY',
    });
    const handler = createResetHandler({
      workshopDir: (id) => `/tmp/workspaces/${id}`,
      closeEditorForWorkspace: async () => ({ closed: false }),
      resetWorkspace: async () => { throw err; },
    });
    const req = mockReq({ workshopId: 'ws1' });
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    assert.equal(res._statusCode, 500);
    const body = res._statusBody as { error?: string };
    assert.match(body.error ?? '', /VS Code ou Cursor/);
    assert.doesNotMatch(body.error ?? '', /EBUSY/);
  });

  test('closes the IDE for the workshop workspace before wiping files', async () => {
    const calls: string[] = [];
    const handler = createResetHandler({
      workshopDir: (id) => `/tmp/workspaces/${id}`,
      closeEditorForWorkspace: async (wsDir) => {
        calls.push(`close:${wsDir}`);
        return { closed: true };
      },
      resetWorkspace: async (workshopId) => {
        calls.push(`reset:${workshopId}`);
      },
    });
    const req = mockReq({ workshopId: 'ws1' });
    const res = mockRes();

    await handler(req as unknown as Request, res as unknown as Response);

    assert.deepEqual(calls, ['close:/tmp/workspaces/ws1', 'reset:ws1']);
    assert.deepEqual(res._statusBody, { ok: true, editorClosed: true });
  });
});
