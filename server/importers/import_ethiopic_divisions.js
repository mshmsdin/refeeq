import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { mapBookDivisionRows } from './book_division.js';

const SOURCE_URL = 'https://ebible.org/Scriptures/arb-vd_readaloud.zip';
const NOTES = 'تقسيم لتغسات من الأمثال 25–31 بحسب ترتيبها في القانون الإثيوبي؛ النص هنا من ترجمة فان دايك العربية، وليس شاهداً جعزياً مستقلاً.';

function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  const translation = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('ar-svd');
  if (!translation) throw new Error('لم تُوجد ترجمة فان دايك في قاعدة البيانات.');

  const sourceRows = db.prepare(`
    SELECT book_code, chapter, verse, text, search_text, source_url
    FROM bible_verses
    WHERE translation_id=? AND book_code='PRO' AND chapter BETWEEN 25 AND 31
    ORDER BY chapter, verse
  `).all(translation.id);
  const rows = mapBookDivisionRows(sourceRows, {
    sourceBookCode: 'PRO', targetBookCode: 'TAGS', sourceChapterStart: 25, chapterCount: 7
  });
  const chapterCount = new Set(rows.map((row) => row.chapter)).size;
  if (chapterCount !== 7 || !rows.length) {
    throw new Error(`بيانات الأمثال غير مكتملة: وُجدت ${chapterCount} فصول من أصل 7.`);
  }

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text,
      source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertAll = db.transaction((items) => {
    for (const row of items) insertVerse.run(
      translation.id, row.book_code, row.chapter, row.verse, row.text, row.search_text, row.source_url || SOURCE_URL
    );
    db.prepare('UPDATE bible_books SET chapter_count=7 WHERE code=\'TAGS\'').run();
    db.prepare(`
      UPDATE bible_book_metadata SET text_status='complete', arabic_status='available',
        source_name='تقسيم عربي من سفر الأمثال', source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code='TAGS'
    `).run(SOURCE_URL, NOTES);
    db.prepare(`
      INSERT OR IGNORE INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES ('TAGS', 'تقسيم عربي من أمثال 25–31', 'Arabic division from Proverbs 25–31', 'العربية', 'available', 'book-division', ?, ?)
    `).run(SOURCE_URL, NOTES);
  });
  insertAll(rows);
  console.log(`[Bible divisions] TAGS: ${chapterCount} فصول، ${rows.length} عددًا؛ المصدر فان دايك من أمثال 25–31.`);
}

try {
  run();
} catch (error) {
  console.error('[Bible divisions import]', error.message);
  process.exitCode = 1;
}
