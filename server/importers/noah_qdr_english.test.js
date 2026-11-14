import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  { witness: '1Q19', slug: 'en-project-1q19-noah-fragments-2026', hebrewSlug: 'he-qdr-1q19-noah-fragments-2026', units: 42 },
  { witness: '1Q19bis', slug: 'en-project-1q19bis-noah-fragments-2026', hebrewSlug: 'he-qdr-1q19bis-noah-fragments-2024', units: 6 }
];

test('keeps English renderings aligned with each separate licensed Noah fragment witness', async () => {
  const englishSources = ADDITIONAL_SOURCES.filter(({ slug }) => EXPECTED.some((item) => item.slug === slug));
  assert.deepEqual(englishSources.map(({ slug }) => slug), EXPECTED.map(({ slug }) => slug));

  for (const expected of EXPECTED) {
    const english = englishSources.find(({ slug }) => slug === expected.slug);
    const hebrew = ADDITIONAL_SOURCES.find(({ slug }) => slug === expected.hebrewSlug);
    assert.ok(hebrew, `missing Hebrew source for ${expected.witness}`);
    assert.equal(english.bookCode, 'NOAH');
    assert.equal(english.language, 'en');
    assert.equal(english.sourceType, 'cc-by-sa-4.0');
    assert.equal(english.siteScope, 'both');
    assert.equal(english.incomplete, true);
    assert.equal(english.expectedUnitCount, expected.units);

    const translated = parseReviewedUnitText(await readFile(english.textFile, 'utf8'), english);
    const original = parseReviewedUnitText(await readFile(hebrew.textFile, 'utf8'), hebrew);
    assert.equal(translated.length, expected.units);
    assert.deepEqual(translated.map(({ chapter, verse, sourceUrl }) => [chapter, verse, sourceUrl]),
      original.map(({ chapter, verse, sourceUrl }) => [chapter, verse, sourceUrl]));
    assert.ok(translated.every(({ text }) => text.trim().length > 0));
  }
});
