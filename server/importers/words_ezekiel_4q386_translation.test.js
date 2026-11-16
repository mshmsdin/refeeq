import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q386 English project draft covers every transcribed line without claiming a complete work', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q386-words-ezekiel');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'Q386');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/words_ezekiel_4q386_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 35);
  assert.equal(hebrew.length, 35);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 35);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [
    ...Array.from({ length: 9 }, (_, i) => [1, i + 1]),
    ...Array.from({ length: 11 }, (_, i) => [2, i + 1]),
    ...Array.from({ length: 8 }, (_, i) => [3, i + 1]),
    ...Array.from({ length: 4 }, (_, i) => [4, i + 1]),
    ...Array.from({ length: 3 }, (_, i) => [5, i + 1])
  ]);
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.includes('/4Q386/2026-10-06')
    && text.trim().length > 0));
  assert.match(units[0].text, /I said|I saw/);
  assert.match(units[7].text, /four winds/i);
  assert.match(units[32].text, /too fragmentary|cannot be translated|no reliable translation/i);
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /مسودة نقل إنجليزي مستقلة/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
});
