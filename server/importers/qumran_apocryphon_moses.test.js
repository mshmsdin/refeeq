import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  { witness: '1Q29', code: 'APM1Q29', slug: 'heb-qdr-1q29-apocryphon-moses-2026', units: 30, groups: 8 },
  { witness: '4Q375', code: 'APM4Q375', slug: 'heb-qdr-4q375-apocryphon-moses-2026', units: 16, groups: 2 },
  { witness: '4Q376', code: 'APM4Q376', slug: 'heb-qdr-4q376-apocryphon-moses-2026', units: 12, groups: 4 },
  { witness: '4Q408', code: 'APM4Q408', slug: 'heb-qdr-4q408-apocryphon-moses-2026', units: 57, groups: 17 }
];

test('catalogues the four licensed Apocryphon of Moses witnesses as separate partial Hebrew texts', () => {
  const sources = EXPECTED.map((item) => ADDITIONAL_SOURCES.find(({ slug }) => slug === item.slug));
  assert.ok(sources.every(Boolean));
  assert.equal(new Set(sources.map(({ bookCode }) => bookCode)).size, EXPECTED.length);

  for (const item of EXPECTED) {
    const source = sources.find(({ slug }) => slug === item.slug);
    assert.equal(source.bookCode, item.code);
    assert.equal(source.language, 'hbo');
    assert.equal(source.originalLanguage, 'العبرية');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedUnitCount, item.units);
    assert.equal(source.maxChapter, item.groups);

    const json = readFileSync(source.textFile, 'utf8');
    const units = parseReviewedUnitText(json, source);
    assert.equal(createHash('sha256').update(json.replace(/\r\n/gu, '\n')).digest('hex'), source.expectedSha256);
    assert.equal(units.length, item.units);
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, item.units);
    assert.equal(new Set(units.map(({ chapter }) => chapter)).size, item.groups);
    assert.ok(units.every(({ text, sourceUrl }) => text.startsWith(`‹${item.witness} frg. `)
      && sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${item.witness}/`)
      && sourceUrl.includes('#')));
  }
});
