import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q391 English draft maps every surviving Hebrew line and preserves uncertainty', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q391-words-ezekiel');
  assert.ok(source, 'English project draft must be registered');
  assert.equal(source.bookCode, 'Q391');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/words_ezekiel_4q391_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 200);
  assert.equal(hebrew.length, 200);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 200);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ chapter }) => chapter)).size, 78);
  assert.ok(units.every(({ text }) => text.trim().length > 0 && !/[\u0590-\u05FF]/u.test(text)));
  assert.equal(units.filter(({ text }) => text === '[Fragment too damaged for a reliable translation.]').length, 51);
  assert.match(units[1].text, /king of Egypt/i);
  assert.match(units[58].text, /land/i);
  assert.match(units[59].text, /lamentation|weeping/i);
  assert.match(units[142].text, /house of Israel/i);
  assert.ok(units.some(({ text }) => /illegible|cannot be translated|uncertain reading|too damaged/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
  assert.match(source.notes, /لا يمثل النص كاملاً/);
});
