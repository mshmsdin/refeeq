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
