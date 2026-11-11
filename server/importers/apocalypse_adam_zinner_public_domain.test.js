import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the public-domain English text of the surviving Apocalypse of Adam witness as partial', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-zinner-apocalypse-adam-public-domain');
  assert.ok(source, 'missing Samuel Zinner Apocalypse of Adam source');
  assert.equal(source.bookCode, 'APADAM');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.incomplete, true, 'the Coptic witness has explicit lacunae');
  assert.equal(source.expectedUnitCount, 49);
  assert.equal(source.expectedWordCount, 3070);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.equal(units.length, source.expectedUnitCount);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), units.map((_, index) => [1, index + 1]));
  assert.equal(units.reduce((total, unit) => total + unit.text.split(/\s+/u).filter(Boolean).length, 0), source.expectedWordCount);
  assert.match(units[0].text, /^\[Introduction\] \[64\]/u);
  assert.match(units[4].text, /^\[Adam.s Vision\]/u);
  assert.ok(units.some(({ text }) => text.includes('[. . .]')), 'printed manuscript lacunae must remain visible');
  const pageMarkers = units.flatMap(({ text }) => [...text.matchAll(/\[(6[4-9]|7\d|8[0-5])\]/gu)].map((match) => Number(match[1])));
  assert.deepEqual(pageMarkers, [...Array.from({ length: 4 }, (_, index) => index + 64), ...Array.from({ length: 17 }, (_, index) => index + 69)]);
  assert.match(units.at(-1).text, /the living\] water\./u);
  assert.match(source.notes, /الملك العام/);
  assert.match(source.notes, /الصفحة نفسها خطأ/u);
});
