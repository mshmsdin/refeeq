import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseReviewedUnitText } from './reviewed_text_source.js';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';

test('imports all WEB Classic units for Confessio Esdrae with the source verse numbers', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-web-confession-esdras');
  assert.ok(source, 'missing WEB Classic parallel translation source');
  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);

  assert.equal(source.bookCode, 'CONFESD');
  assert.equal(source.expectedUnitCount, 17);
  assert.equal(units.length, 17);
  assert.deepEqual(units.map((unit) => unit.verse), Array.from({ length: 17 }, (_, index) => index + 20));
  assert.match(units[0].text, /^“O Lord, you who remain forever/u);
  assert.match(units.at(-1).text, /your goodness will be declared/u);
});
