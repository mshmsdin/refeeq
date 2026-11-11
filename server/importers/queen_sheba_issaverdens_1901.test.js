import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedText } from './reviewed_text_source.js';

test('imports only the 1901 printed English witness and keeps its lacunae marked partial', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-issaverdens-queen-solomon');
  assert.ok(source, 'missing Queen of Sheba source metadata');
  assert.equal(source.incomplete, true, 'printed omissions must remain partial');
  assert.equal(source.originalLanguage, 'الأرمنية');
  const rawText = await readFile(source.textFile, 'utf8');
  const [row] = parseReviewedText(rawText, source);
  assert.equal(row.chapter, 1);
  assert.equal(row.verse, 1);
  assert.ok(row.text.startsWith('QUESTIONS ADDRESSED BY THE QUEEN'));
  assert.ok(row.text.endsWith('all things visible and invisible.'));
  assert.match(row.text, /\.\s*\.\s*\./, 'the translator\'s printed lacunae must not be reconstructed');
  assert.match(source.notes, /الصفحات ٢١١–٢١٥/);
});
