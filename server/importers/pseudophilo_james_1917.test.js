import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedChapterText } from './reviewed_text_source.js';

test('imports all surviving James 1917 chapters without hiding the manuscript gaps or lost ending', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-james-biblical-antiquities');
  assert.ok(source, 'missing Pseudo-Philo source metadata');
  assert.equal(source.incomplete, true, 'the shared lacunae and lost ending must remain partial');
  assert.equal(source.maxChapter, 65);
  const rawText = await readFile(source.textFile, 'utf8');
  const rows = parseReviewedChapterText(rawText, source);
  assert.equal(rows.length, 63);
  assert.deepEqual(rows.map((row) => row.chapter), [...Array.from({ length: 42 }, (_, i) => i + 1), 44, 45, 46, ...Array.from({ length: 18 }, (_, i) => i + 48)]);
  assert.ok(rows[0].text.startsWith('The beginning of the world.'));
  assert.ok(rows.at(-1).text.length > 100);
  assert.match(source.notes, /٣٧:١\/٢/);
  assert.match(source.notes, /٣٧:٥\/٣٨:١/);
  assert.match(source.notes, /خاتمة ضائعة/);
  assert.match(source.notes, /Scanned at sacred-texts\.com, May 2004\./);
});
