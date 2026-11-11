import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the complete public-domain English Sefer Elijah translation as a separate Hebrew witness', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-othergospels-sefer-elijah-zinner-public-domain');
  assert.ok(source, 'missing Samuel Zinner Sefer Elijah source');
  assert.equal(source.bookCode, 'SEELI');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.language, 'en');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.incomplete, false);
  assert.equal(source.expectedUnitCount, 25);
  assert.equal(source.expectedWordCount, 1888);
  assert.match(source.notes, /صموئيل زينر/u);
  assert.match(source.notes, /الملك العام/u);
  assert.match(source.notes, /شاهد عبري متأخر/u);
  assert.match(source.url, /^https:\/\/othergospels\.com\/elijah\/$/u);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.equal(units.length, source.expectedUnitCount);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), units.map((_, index) => [1, index + 1]));
  assert.equal(units.reduce((total, unit) => total + unit.text.split(/\s+/u).filter(Boolean).length, 0), source.expectedWordCount);
  assert.match(units[0].text, /^Thereupon he laid himself down/u);
  assert.ok(units.some(({ text }) => text.includes('(2 Samuel 11:25)')), 'source scripture citations must remain');
  assert.match(units.at(-1).text, /The Book of Elijah, of blessed memory, is ended\.$/u);
  assert.ok(units.every(({ text }) => !/<\/?(?:center|quote)>|\{[^}]+\|[^}]+\}/u.test(text)), 'site presentation markup must be removed');
});
