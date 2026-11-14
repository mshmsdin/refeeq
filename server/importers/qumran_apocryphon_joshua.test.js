import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('retains both licensed Hebrew witnesses of the Apocryphon of Joshua as separate partial sources', async () => {
  const expected = [
    { witness: '4Q378', slug: 'heb-qdr-4q378-apocryphon-joshua-a-2026', units: 155, groups: 36 },
    { witness: '4Q379', slug: 'heb-qdr-4q379-apocryphon-joshua-b-2026', units: 186, groups: 44 }
  ];

  for (const item of expected) {
    const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === item.slug);
    assert.ok(source, `missing source definition for ${item.witness}`);
    assert.equal(source.bookCode, 'APJOSH');
    assert.equal(source.language, 'he');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);

    const raw = await readFile(source.textFile, 'utf8');
    const units = parseReviewedUnitText(raw, source);
    assert.equal(units.length, item.units);
    assert.equal(new Set(units.map(({ chapter }) => chapter)).size, item.groups);
    assert.ok(units.every(({ text, sourceUrl }) => text.startsWith(`‹${item.witness} frg. `) && sourceUrl.includes('#')));
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, item.units);
  }
});
