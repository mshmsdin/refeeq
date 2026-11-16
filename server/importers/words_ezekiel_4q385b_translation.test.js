import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q385b English project draft covers each line and preserves editorial uncertainty', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q385b-words-ezekiel');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'Q385B');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/words_ezekiel_4q385b_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 7);
  assert.equal(hebrew.length, 7);
  assert.ok(units.every((unit, index) => unit.chapter === 1 && unit.verse === index + 1
    && unit.chapter === hebrew[index].chapter && unit.verse === hebrew[index].verse
    && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 7);
  assert.match(units[0].text, /words of Ezekiel/i);
  assert.match(units[2].text, /Put|Egypt/i);
  assert.match(units[3].text, /Cush|uncertain/i);
  assert.match(units[4].text, /perish|Arabia/i);
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /غير التجاري/);
});
