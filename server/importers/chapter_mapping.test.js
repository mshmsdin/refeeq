import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSourceChapter } from './chapter_mapping.js';

test('maps Daniel additions source chapters into the three-book sequence', () => {
  const book = { chapters: 3, sourceChapters: [3, 13, 14] };
  assert.deepEqual([1, 2, 3].map((chapter) => resolveSourceChapter(book, chapter)), [3, 13, 14]);
});

test('keeps sequential chapter numbering for existing importer books', () => {
  const book = { chapters: 4, sourceChapterStart: 10 };
  assert.deepEqual([1, 2, 3, 4].map((chapter) => resolveSourceChapter(book, chapter)), [10, 11, 12, 13]);
});
