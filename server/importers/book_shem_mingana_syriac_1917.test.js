import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the eight surviving Syriac print pages of Mingana 1917 as a partial witness', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'syr-mingana-book-shem-1917');
  assert.ok(source, 'missing the Syriac witness metadata');
  assert.equal(source.bookCode, 'SHEM');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.language, 'syr');
  assert.equal(source.incomplete, true, 'the defective manuscript must remain partial');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.expectedUnitCount, 8);
  assert.deepEqual(source.expectedVerseNumbers, [1, 2, 3, 4, 5, 6, 7, 8]);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [
    [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8]
  ]);
  assert.deepEqual(JSON.parse(rawText).map(({ sourcePage }) => sourcePage), [52, 53, 54, 55, 56, 57, 58, 59]);
  assert.ok(units.every(({ text }) => /[\u0700-\u074f]/u.test(text)), 'all page units must retain Syriac script');
  assert.match(units[0].text, /ܬܘܒ ܡܡܠܠܐ/u, 'page 52 must begin at the Shem title, after Clement');
  assert.doesNotMatch(units[0].text, /Clement|Peter/u, 'preceding Clement lines must not be attributed to Shem');
  assert.match(units[6].text, /ص ٥٨/u, 'the recovered missing page must be present');
  assert.match(source.notes, /١٩١٧/u);
  assert.match(source.notes, /الصفحات ٥٢–٥٩/u);
});
