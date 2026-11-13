import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  { witness: '4Q225', slug: 'he-qdr-4q225-pseudo-jubilees-a-2026', bookCode: 'PSJUBA', counts: [12, 14, 14, 4, 5], words: 631 },
  { witness: '4Q226', slug: 'he-qdr-4q226-pseudo-jubilees-b-2026', bookCode: 'PSJUBB', counts: [8, 5, 6, 4, 3, 9, 8, 4, 4, 3, 2, 3, 3, 2], words: 606 },
  { witness: '4Q227', slug: 'he-qdr-4q227-pseudo-jubilees-c-2026', bookCode: 'PSJUBC', counts: [6, 6], words: 126 }
];

test('preserves the separate licensed 4Q225, 4Q226, and 4Q227 Hebrew fragment witnesses', async () => {
  const sources = ADDITIONAL_SOURCES.filter(({ slug }) => EXPECTED.some((item) => item.slug === slug));
  assert.deepEqual(sources.map(({ slug }) => slug), EXPECTED.map(({ slug }) => slug));
  assert.equal(new Set(sources.map(({ bookCode }) => bookCode)).size, EXPECTED.length,
    'related scrolls remain separate catalog records');

  for (const expected of EXPECTED) {
    const source = sources.find(({ slug }) => slug === expected.slug);
    assert.equal(source.bookCode, expected.bookCode);
    assert.equal(source.language, 'he');
    assert.equal(source.originalLanguage, 'العبرية');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedWordCount, expected.words);
    assert.equal(source.expectedChapterVerseNumbers.length, expected.counts.length);
    assert.deepEqual(source.expectedChapterVerseNumbers.map((group) => group.length), expected.counts);

    const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
    assert.equal(units.length, expected.counts.reduce((sum, count) => sum + count, 0));
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, units.length);
    assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
      source.expectedChapterVerseNumbers.flatMap((lines, index) => lines.map((line) => [index + 1, line])));
    assert.ok(units.every(({ text, sourceUrl }) => text.startsWith(`‹${expected.witness} frg. `)
      && sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${expected.witness}/`)
      && sourceUrl.includes('#c')));
  }
});
