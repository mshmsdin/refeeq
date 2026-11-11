import test from 'node:test';
import assert from 'node:assert/strict';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';

test('exposes Confessio Esdrae as its own chapter while preserving the source verse numbers', () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'la-ocp-confession-esdras');
  assert.ok(source, 'missing OCP Latin Confessio Esdrae source');
  assert.equal(source.bookCode, 'CONFESD');
  assert.equal(source.maxChapter, 1);
  assert.equal(source.chapterOffset, -7, 'the source is 4 Ezra 8:20–36, mapped to standalone chapter 1');
  assert.equal(source.replaceExistingVerses, true, 'old chapter-8 rows must be replaced, not left alongside chapter 1');
  assert.match(source.notes, /عزرا الثاني ٨:٢٠–٣٦/);
});
