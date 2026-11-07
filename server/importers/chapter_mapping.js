export function resolveSourceChapter(book, chapter) {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    throw new RangeError(`رقم فصل غير صالح: ${chapter}`);
  }
  return book.sourceChapters?.[chapter - 1] ?? (book.sourceChapterStart || 1) + chapter - 1;
}

export function mapSourceChapterToTarget(sourceChapter, sourceChapterStart, targetChapterStart = 1) {
  if (!Number.isInteger(sourceChapter) || !Number.isInteger(sourceChapterStart) || !Number.isInteger(targetChapterStart)) {
    throw new TypeError('أرقام الفصول يجب أن تكون أعداداً صحيحة.');
  }
  if (sourceChapter < sourceChapterStart) {
    throw new RangeError(`الفصل ${sourceChapter} يسبق بداية المصدر ${sourceChapterStart}.`);
  }
  return targetChapterStart + sourceChapter - sourceChapterStart;
}
