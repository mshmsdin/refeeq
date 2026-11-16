import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('4Q388 English project draft maps every surviving line to its own licensed Hebrew source line', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q388-words-ezekiel');
  assert.ok(source, 'English project translation must be registered');
  assert.equal(source.bookCode, 'Q388');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'project-translation');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  const hebrew = JSON.parse(await readFile(new URL('./data/words_ezekiel_4q388_qumran_digital_2026.json', import.meta.url), 'utf8'));
  assert.equal(units.length, 38);
  assert.equal(hebrew.length, 38);
  assert.ok(units.every((unit, index) => unit.chapter === hebrew[index].chapter
    && unit.verse === hebrew[index].verse && unit.sourceUrl === hebrew[index].sourceUrl));
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 38);
  assert.deepEqual([...new Set(units.map(({ chapter }) => chapter))], [1,2,3,4,5,6,7,8]);
  assert.match(units[25].text, /end of the land/i);
  assert.match(units[32].text, /redeemer/i);
  assert.match(units[33].text, /covenant/i);
  assert.match(units[0].text, /too fragmentary|no reliable translation/i);
  assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/);
  assert.match(source.notes, /مسودة نقل إنجليزي مستقلة/);
  assert.match(source.notes, /لم يراجعها متخصص في العبرية/);
});
