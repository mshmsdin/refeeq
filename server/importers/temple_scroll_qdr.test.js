import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('preserves every licensed 11QTa line with its original column, line label, and source anchor', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'heb-qdr-11q19-temple-scroll-2025');
  assert.ok(source, 'Temple Scroll transcription is registered');
  assert.equal(source.bookCode, 'TSCROLL');
  assert.equal(source.language, 'he');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 1071);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), units.map((_, index) => [1, index + 1]));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, units.length);
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith(`${source.url}#c`)
    && /-i\d+$/u.test(sourceUrl) && /^‹11QTa عمود .+ سطر .+› /u.test(text)));

  const columns = [...new Set(units.map(({ text }) => text.match(/عمود (.+?) سطر/u)?.[1]))];
  assert.deepEqual(columns, [...Array.from({ length: 65 }, (_, index) => String(index + 2)), 'frg. add. 1']);
  assert.equal(units.filter(({ text }) => text.includes('عمود frg. add. 1 سطر')).length, 3);
  assert.ok(units[0].text.includes('عمود 2 سطر 1'));
  assert.ok(units.at(-1).text.includes('عمود frg. add. 1 سطر 3'));
});
