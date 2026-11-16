import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('Temple Scroll English draft maps every licensed Hebrew line without filling lacunae', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-11q19-temple-scroll');
  assert.ok(source, 'English Temple Scroll project draft must be registered');
  assert.equal(source.bookCode, 'TSCROLL');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 1071);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/temple_scroll_11q19_qumran_digital_2025.json', import.meta.url), 'utf8'));
  const translatedLines = JSON.parse(await readFile(new URL('./data/temple_scroll_11q19_project_english_lines.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 1071);
  assert.equal(hebrew.length, 1071);
  assert.deepEqual(units.map(({ verse, text }) => ({ verse, text })), translatedLines);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 1071);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.ok(units.every(({ text }) => text.trim().length > 0 && !/[\u0590-\u05FF]/u.test(text)));
  assert.ok(units.some(({ text }) => /too damaged|uncertain reading|unreadable/i.test(text)));
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /غير مراجعة من متخصص في العبرية/);
  assert.match(source.notes, /لا يمثل النص كاملاً/);
});
