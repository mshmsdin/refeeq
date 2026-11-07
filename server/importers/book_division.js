export function mapBookDivisionRows(rows, { sourceBookCode, targetBookCode, sourceChapterStart, chapterCount }) {
  const sourceChapterEnd = sourceChapterStart + chapterCount - 1;
  return rows
    .filter((row) => row.book_code === sourceBookCode && row.chapter >= sourceChapterStart && row.chapter <= sourceChapterEnd)
    .map((row) => ({ ...row, book_code: targetBookCode, chapter: row.chapter - sourceChapterStart + 1 }));
}
