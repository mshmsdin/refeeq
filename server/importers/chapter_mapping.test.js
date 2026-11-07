import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSourceChapterToTarget, resolveSourceChapter } from './chapter_mapping.js';

test('maps Daniel additions source chapters into the three-book sequence', () => {
  const book = { chapters: 3, sourceChapters: [3, 13, 14] };
  assert.deepEqual([1, 2, 3].map((chapter) => resolveSourceChapter(book, chapter)), [3, 13, 14]);
});

test('maps Ezra Sutuel source chapters 3 through 14 to target chapters 1 through 12', () => {
  assert.equal(mapSourceChapterToTarget(3, 3), 1);
  assert.equal(mapSourceChapterToTarget(14, 3), 12);
});

test('keeps sequential chapter numbering for existing importer books', () => {
  const book = { chapters: 4, sourceChapterStart: 10 };
  assert.deepEqual([1, 2, 3, 4].map((chapter) => resolveSourceChapter(book, chapter)), [10, 11, 12, 13]);
});
