import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('includes licensed Qumran Aramaic lines with their manuscript locators', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'arc-qdr-book-giants-2026');
  assert.ok(source, 'missing Qumran Digital Book of Giants transcription');
  assert.equal(source.bookCode, 'GIANTS');
  assert.equal(source.language, 'arc');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.expectedUnitCount, 602);
  assert.equal(source.incomplete, true);
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.match(source.notes, /CC(?:-| )BY(?:-| )SA 4\.0/u);
  const raw = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(raw, source);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
    Array.from({ length: 602 }, (_, index) => [1, index + 1]));
  for (const witness of ['1Q23', '1Q24', '2Q26', '4Q203', '4Q530', '4Q531', '4Q532', '4Q533', '6Q8']) {
    assert.ok(units.some(({ text }) => text.includes(witness)), `missing witness ${witness}`);
  }
  assert.ok(units.every(({ sourceUrl }) => sourceUrl.includes('qumran-digital.org/transcriptions/')));
  assert.ok(units.every(({ sourceUrl, text }) => {
    const witness = sourceUrl.match(/transcriptions\/([^/]+)\//u)?.[1];
    return witness && text.startsWith(`‹${witness} `) && /›\s\S/u.test(text);
  }));
});

test('keeps the openly licensed English fragment translation separate and partial', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-jewishmythology-4q531-2026');
  assert.ok(source, 'missing licensed English translation of the 4Q531 excerpts');
  assert.equal(source.bookCode, 'GIANTS');
  assert.equal(source.language, 'en');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.expectedUnitCount, 2);
  assert.equal(source.incomplete, true);
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.match(source.notes, /CC(?:-| )BY(?:-| )SA 4\.0/u);
  assert.match(source.notes, /beta/iu);

  const raw = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(raw, source);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [[1, 1], [1, 2]]);
  assert.ok(units.every(({ sourceUrl }) => sourceUrl.includes('jewishmythology.com/')));
});
