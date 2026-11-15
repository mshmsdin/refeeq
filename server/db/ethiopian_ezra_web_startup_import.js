import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';

export const ETHIOPIAN_EZRA_WEB_SOURCE = {
  bookCode: 'EZRS',
  translationSlug: 'en-web',
  url: 'https://ebible.org/Scriptures/eng-web_vpl.zip',
  textFile: new URL('../importers/data/ethiopian_ezra_web_3_14_2026.json', import.meta.url),
  expectedSha256: 'c57f957b50111ce1ae2c3291f20832ca56f9a4755584a2cb97b1662f50825f8e',
  expectedUnitCount: 715,
  expectedWordCount: 16938,
  maxChapter: 12,
  chapterCounts: [36, 52, 56, 59, 140, 63, 47, 59, 46, 51, 58, 48],
  mappingSourceUrl: 'https://crosswire.org/~dfh/Files/EthiopianCanonAndParatext.pdf',
  sourceName: 'World English Bible Classic: 2 Esdras 3–14',
  labelAr: 'شاهد إنجليزي موازٍ: 2 Esdras 3–14',
  labelEn: 'English parallel witness: 2 Esdras 3–14',
  summary: 'يتاح لعزرا سوتوئيل شاهد إنجليزي موازٍ من الأصحاحات ٣–١٤ في 2 Esdras، مع إعادة ترقيمها من ١ إلى ١٢. هذا الشاهد من البيبل العالمي الكلاسيكي العام الحقوق، وليس نصاً جعزياً، ولا يشمل مقدمات 2 Esdras وملحقاته المسيحية.',
  notes: 'شاهد إنجليزي موازٍ من البيبل العالمي الكلاسيكي العام الحقوق للأصحاحات ٣–١٤ من 2 Esdras، وهي تقابل متن 4 Ezra المرتبط بعزرا سوتوئيل. أُعيد ترقيمها هنا من ١ إلى ١٢؛ هذا ليس نصاً جعزياً ولا يغطي المقدمات والملحقات المسيحية في 2 Esdras. [بيان الحقوق والمصدر](https://ebible.org/eng-web/copyright.htm)؛ [بيان مقابلة 4 Ezra بقانون الكتاب المقدس الإثيوبي](https://crosswire.org/~dfh/Files/EthiopianCanonAndParatext.pdf).'
};

async function readVerifiedUnits() {
  const raw = await readFile(ETHIOPIAN_EZRA_WEB_SOURCE.textFile, 'utf8');
  const actualHash = createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  if (actualHash !== ETHIOPIAN_EZRA_WEB_SOURCE.expectedSha256) {
    throw new Error('بصمة ملف عزرا سوتوئيل لا تطابق الشاهد المدقق');
  }
  const units = JSON.parse(raw);
  if (!Array.isArray(units) || units.length !== ETHIOPIAN_EZRA_WEB_SOURCE.expectedUnitCount) {
    throw new Error('عدد وحدات شاهد عزرا سوتوئيل لا يطابق الملف المدقق');
  }
  const chapterCounts = Array(ETHIOPIAN_EZRA_WEB_SOURCE.maxChapter).fill(0);
  const nextVerse = Array(ETHIOPIAN_EZRA_WEB_SOURCE.maxChapter).fill(1);
  let wordCount = 0;
  for (const unit of units) {
    const chapterIndex = unit.chapter - 1;
    if (!Number.isInteger(unit.chapter) || chapterIndex < 0 || chapterIndex >= chapterCounts.length
      || !Number.isInteger(unit.verse) || unit.verse !== nextVerse[chapterIndex]
      || unit.sourceChapter !== unit.chapter + 2 || unit.sourceUrl !== ETHIOPIAN_EZRA_WEB_SOURCE.url
      || typeof unit.text !== 'string' || !unit.text.trim()) {
      throw new Error('ترقيم أو نص إحدى وحدات شاهد عزرا سوتوئيل غير صالح');
    }
    chapterCounts[chapterIndex] += 1;
    nextVerse[chapterIndex] += 1;
    wordCount += unit.text.trim().split(/\s+/u).filter(Boolean).length;
  }
  if (JSON.stringify(chapterCounts) !== JSON.stringify(ETHIOPIAN_EZRA_WEB_SOURCE.chapterCounts)
    || wordCount !== ETHIOPIAN_EZRA_WEB_SOURCE.expectedWordCount) {
    throw new Error('عدد فصول أو كلمات شاهد عزرا سوتوئيل لا يطابق الملف المدقق');
  }
  return units;
}

async function matchesExisting(db, translationId, units) {
  const expected = units.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text: text.trim(), source_url: sourceUrl
  }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='EZRS' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function stateIsReady(db, translation) {
  const counts = db.prepare(`
    SELECT COUNT(*) AS units, COUNT(DISTINCT chapter) AS chapters
    FROM bible_verses WHERE translation_id=? AND book_code='EZRS'
  `).get(translation.id);
  const metadata = db.prepare(`SELECT summary_ar, text_status FROM bible_book_metadata WHERE book_code='EZRS'`).get();
  const source = db.prepare(`
    SELECT 1 FROM bible_book_sources
    WHERE book_code='EZRS' AND label_ar=? AND language='الإنجليزية' AND source_url=?
      AND source_type='parallel-text' AND availability_status='available'
  `).get(ETHIOPIAN_EZRA_WEB_SOURCE.labelAr, ETHIOPIAN_EZRA_WEB_SOURCE.url);
  return translation.is_active === 1 && translation.site_scope === 'bible'
    && counts.units === ETHIOPIAN_EZRA_WEB_SOURCE.expectedUnitCount
    && counts.chapters === ETHIOPIAN_EZRA_WEB_SOURCE.maxChapter
    && metadata.summary_ar === ETHIOPIAN_EZRA_WEB_SOURCE.summary && metadata.text_status === 'complete'
    && Boolean(source);
}

export async function ensureEthiopianEzraWebImported() {
  const db = getDb();
  const translation = db.prepare('SELECT id, is_active, site_scope FROM bible_translations WHERE slug=?')
    .get(ETHIOPIAN_EZRA_WEB_SOURCE.translationSlug);
  if (!translation || translation.site_scope !== 'bible') return false;
  const units = await readVerifiedUnits();
  if (stateIsReady(db, translation) && await matchesExisting(db, translation.id, units)) return false;

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, 'EZRS', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse) DO UPDATE SET
      text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertAll = db.transaction((rows) => {
    db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=\'EZRS\'').run(translation.id);
    for (const unit of rows) insertVerse.run(
      translation.id, unit.chapter, unit.verse, unit.text.trim(), unit.text.trim(), unit.sourceUrl
    );
    db.prepare("UPDATE bible_books SET chapter_count=12 WHERE code='EZRS'").run();
    db.prepare(`
      UPDATE bible_book_metadata SET summary_ar=?, text_status='complete', english_status='available',
        source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code='EZRS'
    `).run(ETHIOPIAN_EZRA_WEB_SOURCE.summary, ETHIOPIAN_EZRA_WEB_SOURCE.sourceName,
      ETHIOPIAN_EZRA_WEB_SOURCE.url, ETHIOPIAN_EZRA_WEB_SOURCE.notes);
    db.prepare(`
      INSERT INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES ('EZRS', ?, ?, 'الإنجليزية', 'available', 'parallel-text', ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
        label_en=excluded.label_en, availability_status='available', source_type='parallel-text', notes=excluded.notes
    `).run(ETHIOPIAN_EZRA_WEB_SOURCE.labelAr, ETHIOPIAN_EZRA_WEB_SOURCE.labelEn,
      ETHIOPIAN_EZRA_WEB_SOURCE.url, ETHIOPIAN_EZRA_WEB_SOURCE.notes);
  });
  insertAll(units);

  const updatedTranslation = db.prepare('SELECT id, is_active, site_scope FROM bible_translations WHERE id=?').get(translation.id);
  if (!stateIsReady(db, updatedTranslation) || !await matchesExisting(db, translation.id, units)) {
    throw new Error('لم يطابق الشاهد الإنجليزي وحداته الـ٧١٥ بعد استيراده إلى عزرا سوتوئيل');
  }
  return true;
}
