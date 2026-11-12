import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedText } from './reviewed_text_source.js';

test('imports the 1927 Isaac and Jacob witnesses as complete transcriptions with partial-source status', async () => {
  const expected = [
    ['en-box-gaselee-testament-isaac', 'THIS is the coming forth from the body', 'Remember the disciple that wrote, Makarius', 19],
    ['en-box-gaselee-testament-jacob', 'This again also is the coming forth from the body', 'Remember me, that God may forgive me all my sins', 14],
  ];

  for (const [slug, opening, ending, sourcePages] of expected) {
    const source = ADDITIONAL_SOURCES.find((item) => item.slug === slug);
    assert.ok(source, `missing source metadata for ${slug}`);
    assert.equal(source.url, 'https://gospelstudies.org.uk/earlychurch/pdf/e-books/box_g-h/testament-of-abraham_box.pdf');
    assert.equal(source.incomplete, true, `${slug} must preserve the source's documented textual gaps`);
    const rawText = await readFile(source.textFile, 'utf8');
    const [row] = parseReviewedText(rawText, source);
    assert.equal(row.chapter, 1);
    assert.equal(row.verse, 1);
    assert.ok(row.text.startsWith(opening), `${slug} opening was truncated`);
    assert.ok(row.text.includes(ending), `${slug} ending was truncated`);
    assert.equal(row.text.split('\n\n').length, sourcePages + 1, `${slug} source-page coverage changed`);
    assert.match(row.text, /Textual gaps documented by the translator:/i, `${slug} must mark the source's lacunae without filling them`);
  }
});
