import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseReviewedText, parseReviewedUnitText } from './reviewed_text_source.js';

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

test('preserves a reviewed witness range that begins at a source verse other than one', () => {
  const unitsText = JSON.stringify([
    { chapter: 1, verse: 20, text: 'O Lord, hear this prayer and remember your servant.' },
    { chapter: 1, verse: 21, text: 'Let your mercy remain with your people forever.' },
  ]);
  const unitSource = {
    slug: 'reviewed-offset-units-test',
    expectedSha256: createHash('sha256').update(unitsText).digest('hex'),
    expectedWordCount: 17,
    expectedUnitCount: 2,
    expectedFirstVerse: 20,
    maxChapter: 1,
    url: 'https://example.invalid/source',
  };

  const rows = parseReviewedUnitText(unitsText, unitSource);

  assert.deepEqual(rows.map(({ chapter, verse }) => [chapter, verse]), [[1, 20], [1, 21]]);
});
