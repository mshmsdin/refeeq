import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED_CHAPTER_COUNTS = [
  19, 26, 27, 26, 7, 30, 27, 22, 25, 4, 15, 14, 25, 17, 22, 21, 20, 19,
  0, 26, 34, 34, 34
];

test('preserves the licensed 1Q20 Aramaic Genesis Apocryphon lines and original references', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'arc-qdr-1q20-genesis-apocryphon-2026');
  assert.ok(source, '1Q20 source is registered');
  assert.equal(source.bookCode, 'GENAP');
  assert.equal(source.language, 'arc');
  assert.equal(source.originalLanguage, 'الآرامية');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 494);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 494);
  assert.deepEqual(units.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, Array(23).fill(0)), EXPECTED_CHAPTER_COUNTS);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 494);
  assert.ok(units.every(({ chapter, verse, text, sourceUrl }) => {
    const originalColumn = chapter - 1;
    return text.startsWith(`‹1Q20 col. ${originalColumn}, line ${verse}› `)
      && sourceUrl.startsWith('https://lexicon.qumran-digital.org/transcriptions/1Q20/2026-10-06/index.html?v=2026-10-06#c')
      && /[\u0590-\u05FF○_]/u.test(text);
  }));
  assert.ok(!units.some(({ chapter }) => chapter === 19), 'the absent manuscript column 18 remains absent');
});
