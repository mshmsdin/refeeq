import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchText } from './source_fetch.js';

test('aborts stalled source requests within the configured timeout', async () => {
  const keepAlive = setTimeout(() => {}, 100);
  try {
    await assert.rejects(
      fetchText('https://example.invalid/source', {
        timeoutMs: 10,
        fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
      }),
      { name: 'TimeoutError' }
    );
  } finally {
    clearTimeout(keepAlive);
  }
});
