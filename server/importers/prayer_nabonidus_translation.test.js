import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('Prayer of Nabonidus English translation preserves all 14 fragment lines as a partial witness', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-prayer-nabonidus-4q242');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'Q242');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'الآرامية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 14);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [
    ...Array.from({ length: 9 }, (_, i) => [1, i + 1]),
    ...Array.from({ length: 5 }, (_, i) => [2, i + 1])
  ]);
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.includes('4Q242/2026-10-06')
    && text.trim().length > 0));
  assert.match(units[8].text, /fragmentary|unreadable|illegible/i);
  assert.match(units[9].text, /fragmentary|unreadable|illegible|scattered/i);
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /مسودة نقل إنجليزي مستقلة/);
  assert.match(source.notes, /غير مراجعة من متخصص في الآرامية/);
});
