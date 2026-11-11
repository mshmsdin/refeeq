import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES } from './import_noncanonical_english.js';

test('keeps the surviving Latin Testament of Moses witnesses marked partial', () => {
  const witnesses = SOURCES.filter((source) => source.bookCode === 'MOS');
  assert.equal(witnesses.length, 2);
  for (const source of witnesses) {
    assert.equal(source.maxChapter, 12);
    assert.equal(source.incomplete, true);
    assert.match(source.notes, /ناقص|ينقطع قبل الخاتمة/);
  }
});
