import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q387a English project draft glosses only legible fragments and preserves every source line', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q387a-apocryphon-jeremiah-c');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'AJC387A');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/apocryphon_jeremiah_4q387a_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 32);
  assert.equal(hebrew.length, 32);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 32);
  assert.match(units[0].text, /return|turn back/i);
  assert.match(units[7].text, /bring out/i);
  assert.match(units[16].text, /Benjamin/i);
  assert.match(units[20].text, /curse/i);
  assert.match(units[28].text, /nation|people/i);
  assert.ok(units.some(({ text }) => /no readable text survives/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /لا يمثل الشاهد نصاً كاملاً/);
});
