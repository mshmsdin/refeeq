import { createHash } from 'node:crypto';

export function parseReviewedText(rawText, source) {
  const actualSha256 = createHash('sha256').update(rawText, 'utf8').digest('hex');
  if (actualSha256 !== source.expectedSha256) {
    throw new Error(`بصمة الملف لا تطابق النسخة المدققة في ${source.slug}`);
  }
  const text = rawText.trim();
  const wordCount = text.split(/\s+/u).filter(Boolean).length;
  if (wordCount !== source.expectedWordCount) {
    throw new Error(`عدد كلمات النص المدقق غير مطابق في ${source.slug}: ${wordCount}`);
  }
  if (text.length < 100 || !/[.!?](?:['’"])?$/u.test(text)) {
    throw new Error(`نهاية النص المدقق غير واضحة في ${source.slug}`);
  }
  return [{ chapter: 1, verse: 1, text, sourceUrl: source.url }];
}
