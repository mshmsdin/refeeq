import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q388a English project draft preserves all source lines and marks gaps', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q388a-apocryphon-jeremiah-c');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'AJC388A');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/apocryphon_jeremiah_4q388a_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 67);
  assert.equal(hebrew.length, 67);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 67);
  assert.match(units[12].text, /abandoned us, our God/i);
  assert.match(units[13].text, /my appointed times|my holy things/i);
  assert.match(units[29].text, /they broke the covenant/i);
  assert.match(units[34].text, /priests of Jerusalem/i);
  assert.ok(units.some(({ text }) => /No readable text survives/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /لا يمثل الشاهد نصاً كاملاً/);
  assert.match(source.notes, /غير التجاري/);
});
