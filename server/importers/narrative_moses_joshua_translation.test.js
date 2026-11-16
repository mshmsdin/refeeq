import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES, SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const source = [...SOURCES, ...ADDITIONAL_SOURCES].find(
  (entry) => entry.slug === 'en-project-narrative-moses-joshua-vassiliev-1893'
);

test('the independent English translation covers each scanned page group 257–264', async () => {
  assert.ok(source, 'English translation source is registered');
  assert.equal(source.bookCode, 'NARMOS');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 8);

  const raw = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(raw, source);

  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
    Array.from({ length: 8 }, (_, index) => [1, index + 1]));
  assert.deepEqual(units.map(({ sourceUrl }) => sourceUrl),
    Array.from({ length: 8 }, (_, index) =>
      `https://archive.org/details/anecdotagraecob00vasigoog/page/${342 + index}/mode/2up`));
  assert.match(units[0].text, /^\[…\]/u);
  assert.match(units.at(-1).text, /\[…\]$/u);
});
