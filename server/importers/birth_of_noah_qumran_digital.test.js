import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  {
    manuscript: '4Q534', slug: 'arc-qdr-4q534-birth-noah-2026', units: 51,
    verses: [
      Array.from({ length: 17 }, (_, index) => index + 1),
      Array.from({ length: 21 }, (_, index) => index + 1),
      [1], [1, 2], [1], [1, 2], Array.from({ length: 7 }, (_, index) => index + 1)
    ]
  },
  {
    manuscript: '4Q535', slug: 'arc-qdr-4q535-birth-noah-2026', units: 12,
    verses: [[1, 2], [1, 2, 3, 4], [1, 2, 3, 4, 5, 6]]
  },
  {
    manuscript: '4Q536', slug: 'arc-qdr-4q536-birth-noah-2026', units: 25,
    verses: [[1, 2, 3, 4], Array.from({ length: 13 }, (_, index) => index + 1),
      [7, 8, 9, 10, 11, 12, 13], [1]]
  }
];

test('records every licensed Birth of Noah manuscript line separately', async () => {
  const sources = ADDITIONAL_SOURCES.filter(({ slug }) => EXPECTED.some(item => item.slug === slug));
  assert.deepEqual(sources.map(({ slug }) => slug), EXPECTED.map(({ slug }) => slug));

  for (const expected of EXPECTED) {
    const source = sources.find(({ slug }) => slug === expected.slug);
    assert.equal(source.bookCode, 'BNOAH');
    assert.equal(source.language, 'arc');
    assert.equal(source.originalLanguage, 'الآرامية');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.expectedUnitCount, expected.units);
    assert.equal(source.expectedChapterVerseNumbers.length, expected.verses.length);
    assert.deepEqual(source.expectedChapterVerseNumbers, expected.verses);

    const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
    assert.equal(units.length, expected.units);
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, expected.units);
    assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.includes(`/transcriptions/${expected.manuscript}/`)
      && sourceUrl.includes('#c') && text.startsWith(`‹${expected.manuscript} frg. `)));
  }
});
