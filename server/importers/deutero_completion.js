export function isCompleteDeuteroBook(expectedChapterCount, chapters) {
  if (!Number.isInteger(expectedChapterCount) || expectedChapterCount < 1
    || !Array.isArray(chapters) || chapters.length !== expectedChapterCount) return false;

  return chapters.every((chapter, index) => chapter.chapter === index + 1
    && Array.isArray(chapter.verses) && chapter.verses.length > 0
    && chapter.verses.every((verse, verseIndex) => verse.verse === verseIndex + 1));
}
