/**
 * قارئ ملفات فصول فان دايك بصيغة eBible ReadAloud.
 *
 * بنية الملف:
 *   السطر الأول: عنوان السفر.
 *   السطر الثاني: "N." حيث N رقم **الفصل** وليس رقم عدد.
 *   ما بعده: عدد واحد في كل سطر، متسلسلاً من 1.
 *
 * كان المستورد القديم يقرأ رقم الفصل على أنه رقم العدد الأول، فيزاح كل فصل
 * بعد الأول بمقدار (رقم الفصل − 1): تثنية ١٨ تبدأ بالعدد ١٨ وهكذا.
 */
export function parseChapterFile(content) {
  const text = String(content || '').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const verses = [];
  let started = false;
  let verseNum = 1;

  for (const line of lines) {
    // علامة الفصل "N.": تبدأ العد من 1 ولا تدخل في الأرقام.
    if (/^\d+\.$/.test(line)) {
      started = true;
      verseNum = 1;
      continue;
    }
    if (!started) continue; // عنوان السفر قبل علامة الفصل
    if (line.length < 3) continue;
    if (!/[؀-ۿ]/.test(line)) continue;

    verses.push({ verse: verseNum, text: line });
    verseNum += 1;
  }

  return verses;
}
