import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVplBookRows } from './import_ethiopian_sirach_parallel.js';

function completeFixture() {
  return Array.from({ length: 51 }, (_, index) => `SIR ${index + 1}:1 Verse ${index + 1}`).join('\n');
}

test('parses a complete 51 chapter Sirach parallel witness', () => {
  const rows = parseVplBookRows(completeFixture());
  assert.equal(rows.length, 51);
  assert.deepEqual(rows[0], { chapter: 1, verse: 1, text: 'Verse 1' });
  assert.deepEqual(rows.at(-1), { chapter: 51, verse: 1, text: 'Verse 51' });
});

test('rejects a missing chapter in the Sirach source', () => {
  const incomplete = completeFixture().split('\n').filter((line) => !line.startsWith('SIR 25:'));
  assert.throws(() => parseVplBookRows(incomplete.join('\n')), /غير مكتمل/);
});

test('rejects gaps in a chapter verse sequence', () => {
  const lines = completeFixture().split('\n');
  lines.push('SIR 1:3 Verse 3');
  assert.throws(() => parseVplBookRows(lines.join('\n')), /غير مكتمل أو غير متصل/);
});
