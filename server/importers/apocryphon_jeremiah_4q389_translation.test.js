import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q389 English project draft preserves every licensed source line and its gaps', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q389-apocryphon-jeremiah-c');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'AJC389');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/apocryphon_jeremiah_4q389_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 56);
  assert.equal(hebrew.length, 56);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 56);
  assert.match(units[4].text, /son of Hilkiah/i);
  assert.match(units[21].text, /Give us a king/i);
  assert.match(units[34].text, /complete their guilt/i);
  assert.match(units[37].text, /covenant.*Abraham.*Isaac/i);
  assert.ok(units.some(({ text }) => /No readable text survives/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /لا تمثل الشاهد أو العمل الأدبي كاملاً/);
  assert.match(source.notes, /غير التجاري/);
});
