import test from 'node:test';
import assert from 'node:assert/strict';
import { isCompleteDeuteroBook } from './deutero_completion.js';

test('a book is complete only when every expected chapter and verse is present in order', () => {
  const complete = [
    { chapter: 1, verses: [{ verse: 1 }, { verse: 2 }] },
    { chapter: 2, verses: [{ verse: 1 }] },
  ];
  const missingChapter = [complete[0]];
  const missingVerse = [complete[0], { chapter: 2, verses: [{ verse: 2 }] }];

  assert.equal(isCompleteDeuteroBook(2, complete), true);
  assert.equal(isCompleteDeuteroBook(2, missingChapter), false);
  assert.equal(isCompleteDeuteroBook(2, missingVerse), false);
});
