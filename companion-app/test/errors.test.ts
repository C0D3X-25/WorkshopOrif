import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatResetError } from '../src/errors';

describe('formatResetError', () => {
  test('explains that the IDE must be closed when the workspace folder is locked', () => {
    const err = Object.assign(new Error("EBUSY: resource busy or locked, rmdir 'C:\\ws'"), {
      code: 'EBUSY',
    });
    const message = formatResetError(err);
    assert.match(message, /VS Code ou Cursor/);
    assert.match(message, /Fermez complètement/);
    assert.doesNotMatch(message, /EBUSY/);
  });

  test('returns a generic message for unexpected failures', () => {
    const message = formatResetError(new Error('something unexpected'));
    assert.match(message, /Impossible de réinitialiser/);
    assert.doesNotMatch(message, /something unexpected/);
  });
});
