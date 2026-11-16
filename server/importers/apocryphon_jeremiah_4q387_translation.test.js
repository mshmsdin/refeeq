import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q387 English project draft preserves all source lines and marks reconstruction gaps', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q387-apocryphon-jeremiah-c');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'AJC387');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/apocryphon_jeremiah_4q387_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 54);
  assert.equal(hebrew.length, 54);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 54);
  assert.match(units[1].text, /abandoned us, our God/i);
  assert.match(units[11].text, /all your heart/i);
  assert.match(units[14].text, /madness, blindness/i);
  assert.match(units[23].text, /kingdom of Egypt/i);
  assert.match(units[38].text, /not for bread|hearing the words/i);
  assert.ok(units.some(({ text }) => /No readable text survives/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /لا يمثل الشاهد نصاً كاملاً/);
});
