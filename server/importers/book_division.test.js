import test from 'node:test';
import assert from 'node:assert/strict';
import { mapBookDivisionRows } from './book_division.js';

test('maps source chapters 25 through 31 to division chapters 1 through 7', () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({
    book_code: 'PRO', chapter: index + 24, verse: 1, text: `verse ${index + 24}`
  }));

  const divided = mapBookDivisionRows(rows, { sourceBookCode: 'PRO', targetBookCode: 'TAGS', sourceChapterStart: 25, chapterCount: 7 });
  assert.deepEqual(divided.map((row) => row.chapter), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(divided.every((row) => row.book_code === 'TAGS'));
  assert.equal(divided[0].text, 'verse 25');
});
