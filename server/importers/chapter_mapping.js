export function resolveSourceChapter(book, chapter) {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    throw new RangeError(`رقم فصل غير صالح: ${chapter}`);
  }
  return book.sourceChapters?.[chapter - 1] ?? (book.sourceChapterStart || 1) + chapter - 1;
}
