import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q390 English project draft preserves all witness lines and disputed attribution', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q390-qumran-witness');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'AJC390');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/apocryphon_jeremiah_4q390_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 51);
  assert.equal(hebrew.length, 51);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 51);
  assert.match(units[3].text, /evil in my sight/);
  assert.match(units[16].text, /Belial/);
  assert.match(units[20].text, /oppression, wealth, and gain/);
  assert.match(units[21].text, /robs and exploits/i);
  assert.ok(units.some(({ text }) => /No readable text survives/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /نسبة 4Q390 .* محل خلاف/);
  assert.match(source.notes, /لا تمثل الشاهد نصاً كاملاً/);
});
