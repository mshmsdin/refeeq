import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedText } from './reviewed_text_source.js';

test('imports Walker 1885 as a complete public-domain English witness for the Greek Apocalypse of Ezra', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-walker-greek-apocalypse-ezra-1885');
  assert.ok(source, 'missing Walker 1885 English translation metadata');
  assert.equal(source.bookCode, 'APEZRA');
  assert.notEqual(source.incomplete, true);
  assert.equal(source.language, 'en');
  assert.match(source.notes, /طبعة.*١٨٨٥/);
  assert.match(source.notes, /تيشندورف/);

  const rawText = await readFile(source.textFile, 'utf8');
  const [row] = parseReviewedText(rawText, source);
  assert.equal(row.chapter, 1);
  assert.equal(row.verse, 1);
  assert.match(row.text, /^It came to pass in the thirtieth year/);
  assert.match(row.text, /now and ever, and to ages of ages\. Amen\.$/);
  assert.equal(row.text.split('\n\n').length, 3, 'the three source paragraphs must remain distinct');
  assert.doesNotMatch(row.text, /footnote|\{\d+\}/i, 'editorial footnotes must not enter the reading text');
  assert.equal(row.text.split(/\s+/u).length, source.expectedWordCount);
  assert.doesNotMatch(row.text, /\s[,.!?;:]/u, 'HTML spacing around sentence punctuation must be normalized');
});
