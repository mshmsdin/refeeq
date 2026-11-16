import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q385 English project draft keeps every line in its own fragment group', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q385-words-ezekiel');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'Q385');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 44);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [
    [1,1],[1,2],[1,3],
    ...Array.from({ length: 10 }, (_, i) => [2, i + 1]),
    ...Array.from({ length: 7 }, (_, i) => [3, i + 1]),
    ...Array.from({ length: 7 }, (_, i) => [4, i + 1]),
    [5,1],[5,2],
    ...Array.from({ length: 15 }, (_, i) => [6, i + 1])
  ]);
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.includes('/4Q385/2026-10-06')
    && text.trim().length > 0));
  assert.match(units[0].text, /fragmentary|unreadable|illegible|incomplete|damaged|scattered/i);
  assert.match(units[27].text, /fragmentary|unreadable|illegible|incomplete|damaged|scattered/i);
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /مسودة نقل إنجليزي مستقلة/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
});
