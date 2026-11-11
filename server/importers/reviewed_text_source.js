import { createHash } from 'node:crypto';

export function parseReviewedText(rawText, source) {
  const normalizedText = rawText.replace(/\r\n/g, '\n');
  const actualSha256 = createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  if (actualSha256 !== source.expectedSha256) {
    throw new Error(`بصمة الملف لا تطابق النسخة المدققة في ${source.slug}`);
  }
  const text = normalizedText.trim();
  const wordCount = text.split(/\s+/u).filter(Boolean).length;
  if (wordCount !== source.expectedWordCount) {
    throw new Error(`عدد كلمات النص المدقق غير مطابق في ${source.slug}: ${wordCount}`);
  }
  if (text.length < 100 || !/[.!?](?:['’"])?$/u.test(text)) {
    throw new Error(`نهاية النص المدقق غير واضحة في ${source.slug}`);
  }
  return [{ chapter: 1, verse: 1, text, sourceUrl: source.url }];
}

export function parseReviewedChapterText(rawText, source) {
  const normalizedText = rawText.replace(/\r\n/g, '\n');
  const actualSha256 = createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  if (actualSha256 !== source.expectedSha256) {
    throw new Error(`بصمة ملف الفصول لا تطابق النسخة المدققة في ${source.slug}`);
  }
  let chapters;
  try {
    chapters = JSON.parse(normalizedText);
  } catch {
    throw new Error(`ملف الفصول المدقق ليس بصيغة صحيحة في ${source.slug}`);
  }
  if (!Array.isArray(chapters) || chapters.length !== source.expectedChapterCount) {
    throw new Error(`عدد الفصول لا يطابق النسخة المدققة في ${source.slug}`);
  }
  const chapterNumbers = chapters.map((chapter) => chapter.chapter);
  if (JSON.stringify(chapterNumbers) !== JSON.stringify(source.expectedChapters)) {
    throw new Error(`ترقيم الفصول أو الفجوات لا يطابق النسخة المدققة في ${source.slug}`);
  }
  return chapters.map((chapter) => {
    if (!Number.isInteger(chapter.chapter) || chapter.chapter < 1 || chapter.chapter > source.maxChapter
      || typeof chapter.text !== 'string' || chapter.text.trim().length < 60
      || !/[.!?;:\]]$/u.test(chapter.text.trim())) {
      throw new Error(`نص الفصل ${chapter.chapter} غير صالح في ${source.slug}`);
    }
    return { chapter: chapter.chapter, verse: 1, text: chapter.text.trim(), sourceUrl: source.url };
  });
}

export function parseReviewedUnitText(rawText, source) {
  const normalizedText = rawText.replace(/\r\n/g, '\n');
  const actualSha256 = createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  if (actualSha256 !== source.expectedSha256) {
    throw new Error(`بصمة ملف الوحدات لا تطابق النسخة المدققة في ${source.slug}`);
  }
  let units;
  try {
    units = JSON.parse(normalizedText);
  } catch {
    throw new Error(`ملف الوحدات المدقق ليس بصيغة صحيحة في ${source.slug}`);
  }
  if (!Array.isArray(units) || units.length !== source.expectedUnitCount) {
    throw new Error(`عدد الوحدات لا يطابق النسخة المدققة في ${source.slug}`);
  }
  const chapterVerses = new Map();
  const expectedFirstVerse = source.expectedFirstVerse ?? 1;
  if (source.expectedVerseNumbers && (!Array.isArray(source.expectedVerseNumbers)
    || source.expectedVerseNumbers.length !== units.length
    || source.expectedVerseNumbers.some((verse) => !Number.isInteger(verse) || verse < 1))) {
    throw new Error(`ترقيم الوحدات المصدرية غير صالح في ${source.slug}`);
  }
  for (const [index, unit] of units.entries()) {
    if (!Number.isInteger(unit.chapter) || unit.chapter < 1 || unit.chapter > source.maxChapter
      || !Number.isInteger(unit.verse) || unit.verse < 1
      || typeof unit.text !== 'string' || unit.text.trim().length < 10) {
      throw new Error(`بيانات إحدى الوحدات غير صالحة في ${source.slug}`);
    }
    const chapterUnitCount = chapterVerses.get(unit.chapter) || 0;
    const expectedVerse = source.expectedVerseNumbers
      ? source.expectedVerseNumbers[index]
      : chapterUnitCount + expectedFirstVerse;
    if (source.expectedVerseNumbers && unit.chapter !== 1) {
      throw new Error(`ترقيم الوحدات المصدرية يدعم فصلاً واحداً فقط في ${source.slug}`);
    }
    if (unit.verse !== expectedVerse) {
      throw new Error(`تسلسل الوحدات غير مكتمل في الفصل ${unit.chapter} من ${source.slug}`);
    }
    chapterVerses.set(unit.chapter, chapterUnitCount + 1);
  }
  const wordCount = units.reduce((count, unit) => count + unit.text.trim().split(/\s+/u).filter(Boolean).length, 0);
  if (wordCount !== source.expectedWordCount) {
    throw new Error(`عدد كلمات الوحدات غير مطابق في ${source.slug}: ${wordCount}`);
  }
  return units.map((unit) => ({ ...unit, text: unit.text.trim(), sourceUrl: source.url }));
}
