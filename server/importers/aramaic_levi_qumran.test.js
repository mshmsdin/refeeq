import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('preserves every licensed Qumran Digital Aramaic Levi line as a separately linked fragment witness', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'arc-qdr-aramaic-levi-2026');
  assert.ok(source, 'Aramaic Levi Qumran source is registered');
  assert.equal(source.bookCode, 'ARL');
  assert.equal(source.language, 'arc');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 281);
  assert.deepEqual([...new Set(units.map(({ text }) => text.match(/^‹([14]Q\d+[a-z]?)/u)?.[1]).filter(Boolean))].sort(), [
    '1Q21', '4Q213', '4Q213a', '4Q213b', '4Q214', '4Q214a', '4Q214b'
  ]);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), units.map((_, index) => [1, index + 1]));
  assert.ok(units.every(({ text, sourceUrl }) => text.trim() && /^https:\/\/lexicon\.qumran-digital\.org\/transcriptions\/(?:1Q21|4Q213a?|4Q213b|4Q214a?b?)(?:\/|\?)/u.test(sourceUrl)));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, units.length);
});
