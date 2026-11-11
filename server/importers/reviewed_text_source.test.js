import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseReviewedText } from './reviewed_text_source.js';

const text = 'The first sentence has enough words to be meaningful.\nThe final sentence records the ending of this witness.';
const source = {
  slug: 'reviewed-test',
  expectedSha256: createHash('sha256').update(text).digest('hex'),
  expectedWordCount: 18,
  url: 'https://example.invalid/source',
};

test('accepts a reviewed witness only when its checksum and complete text match', () => {
  const rows = parseReviewedText(text, source);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, text);
  assert.equal(rows[0].chapter, 1);
  assert.equal(rows[0].verse, 1);
});

test('rejects reviewed text that differs from the recorded edition file', () => {
  assert.throws(() => parseReviewedText(`${text} altered`, source), /بصمة الملف/);
});

test('accepts Windows line endings without changing the reviewed words', () => {
  const windowsText = text.replace(/\n/g, '\r\n');
  assert.equal(parseReviewedText(windowsText, source)[0].text, text);
});
