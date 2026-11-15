import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports only Rylands 23 Ge’ez readings for the available first 71 chapters', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'gez-ocp-1en-rylands23-p-2026');
  assert.ok(source, 'the public-domain Ethiopic manuscript witness is configured');
  assert.equal(source.language, 'gez');
  assert.equal(source.maxChapter, 71);
  assert.equal(source.incomplete, true);
  assert.equal(source.readingMss, 'p');
  assert.equal(source.expectedUnitCount, 542);
  assert.equal(source.expectedWordCount, 8768);

  const raw = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(raw, source);
  assert.equal(units.length, 542);
  assert.deepEqual([...new Set(units.map(({ chapter }) => chapter))], Array.from({ length: 71 }, (_, i) => i + 1));
  assert.ok(units.every(({ text, sourceUrl }) => /[\u1200-\u137f]/u.test(text) && sourceUrl === source.url));
  assert.ok(units.some(({ chapter, verse, text }) => chapter === 1 && verse === 2 && text.includes('ራዕየ')));
  assert.ok(!units.some(({ chapter, verse, text }) => chapter === 1 && verse === 2 && text.includes('ራእየ')));
  assert.ok(!units.some(({ chapter }) => chapter > 71), 'chapters absent from the source are not fabricated');
});
