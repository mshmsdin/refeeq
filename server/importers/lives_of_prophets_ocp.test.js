import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const SLUGS = [
  ['en-ocp-lives-prophets-2026', 'en', 3480],
  ['grc-ocp-lives-prophets-2026', 'grc', 2700]
];

test('preserves the complete OCP Greek text and its English translation as separate witnesses', async () => {
  for (const [slug, language, expectedWordCount] of SLUGS) {
    const source = ADDITIONAL_SOURCES.find((item) => item.slug === slug);
    assert.ok(source, `missing source ${slug}`);
    assert.equal(source.bookCode, 'LPRO');
    assert.equal(source.language, language);
    assert.equal(source.sourceType, 'cc-by-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, false);
    assert.equal(source.maxChapter, 23);
    assert.equal(source.expectedUnitCount, 141);
    assert.equal(source.expectedWordCount, expectedWordCount);

    const rawText = await readFile(source.textFile, 'utf8');
    const rows = parseReviewedUnitText(rawText, source);
    assert.equal(rows.length, 141);
    assert.deepEqual(rows.map(({ chapter, verse }) => [chapter, verse]), source.expectedUnitLocations);
    assert.ok(rows.every(({ sourceUrl }) => sourceUrl === source.url));
  }
});
