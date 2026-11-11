import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the complete public-domain English Coptic Fourteenth Vision of Daniel as a separate witness', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-pearse-coptic-apocalypse-daniel-public-domain');
  assert.ok(source, 'missing Roger Pearse English Coptic Apocalypse of Daniel source');
  assert.equal(source.bookCode, 'APDANC');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'القبطية');
  assert.equal(source.incomplete, false);
  assert.equal(source.expectedUnitCount, 28);
  assert.equal(source.expectedWordCount, 1839);
  assert.match(source.notes, /فريدريك ماكلير/u);
  assert.match(source.notes, /الفرنسية لعام/u);
  assert.match(source.notes, /تقريبية/u);
  assert.match(source.notes, /ملك عام/u);
  assert.match(source.url, /^https:\/\/www\.tertullian\.org\/fathers\/apocalypse_of_daniel_coptic_02_text\.htm$/u);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.equal(units.length, source.expectedUnitCount);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), units.map((_, index) => [1, index + 1]));
  assert.equal(units.reduce((total, unit) => total + unit.text.split(/\s+/u).filter(Boolean).length, 0), source.expectedWordCount);
  assert.match(units[0].text, /^In the third year of Cyrus the Persian/u);
  assert.match(units.at(-1).text, /To him be glory and power forever\. Amen\.$/u);
  assert.ok(units.every(({ text }) => !/Roger Pearse|Frédéric Macler|Condensed footnotes|The Fourteenth Vision/u.test(text)), 'editorial matter and notes must stay outside the translated text');
});
