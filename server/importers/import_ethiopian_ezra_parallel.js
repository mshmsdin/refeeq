import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { mapSourceChapterToTarget } from './chapter_mapping.js';

const SOURCE_URL = 'https://ebible.org/Scriptures/eng-web_vpl.zip';
const NOTES = 'شاهد إنجليزي موازي من البيبل العالمي للأصحاحات 3–14 من 2 Esdras، وهي تقابل متن 4 Ezra المرتبط بعزرا سوتوئيل. أُعيد ترقيمها هنا من 1 إلى 12. هذا ليس نصاً جعزياً ولا يغطي المقدمات والملحقات المسيحية في 2 Esdras.';
const MAPPING_SOURCE_URL = 'https://crosswire.org/~dfh/Files/EthiopianCanonAndParatext.pdf';

function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  const translation = db.prepare('SELECT id FROM bible_translations WHERE slug=? AND is_active=1').get('en-web');
  if (!translation) throw new Error('لم توجد ترجمة البيبل العالمي قبل استيراد الشاهد.');

  const sourceRows = db.prepare(`
    SELECT chapter, verse, text, search_text, source_url
    FROM bible_verses
    WHERE translation_id=? AND book_code='2ES' AND chapter BETWEEN 3 AND 14
    ORDER BY chapter, verse
  `).all(translation.id);
  const chapters = [...new Set(sourceRows.map((row) => row.chapter))];
  if (chapters.length !== 12 || chapters[0] !== 3 || chapters.at(-1) !== 14) {
    throw new Error(`نص المصدر غير مكتمل: وُجدت ${chapters.length} فصول من 3 إلى 14.`);
  }

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, 'EZRS', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text,
      source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertAll = db.transaction((rows) => {
    for (const row of rows) {
      insertVerse.run(
        translation.id,
        mapSourceChapterToTarget(row.chapter, 3),
        row.verse,
        row.text,
        row.search_text,
        row.source_url || SOURCE_URL
      );
    }
    db.prepare('UPDATE bible_books SET chapter_count=12 WHERE code=\'EZRS\'').run();
    db.prepare(`
      UPDATE bible_book_metadata SET text_status='complete', english_status='available',
        source_name='World English Bible Classic: 2 Esdras 3–14', source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code='EZRS'
    `).run(SOURCE_URL, `${NOTES} بيان المقابلة: ${MAPPING_SOURCE_URL}`);
    db.prepare(`
      INSERT OR IGNORE INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES ('EZRS', 'شاهد إنجليزي موازٍ: 2 Esdras 3–14', 'English parallel witness: 2 Esdras 3–14', 'الإنجليزية', 'available', 'parallel-text', ?, ?)
    `).run(SOURCE_URL, `${NOTES} بيان المقابلة: ${MAPPING_SOURCE_URL}`);
  });
  insertAll(sourceRows);
  console.log(`[Bible parallel import] EZRS: ${chapters.length} فصلاً، ${sourceRows.length} عدداً؛ من 2 Esdras 3–14 إلى 1–12.`);
}

try {
  run();
} catch (error) {
  console.error('[Bible parallel import]', error.message);
  process.exitCode = 1;
}
