import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';
import { isCompleteDeuteroBook } from '../importers/deutero_completion.js';

const SOURCE_FILE = fileURLToPath(new URL('../importers/data/jesuit_deuterocanon_1876_1880.json', import.meta.url));
const SOURCE_SHA256 = '9d2733706b801c5acb67c74fc5cbc2a636d6316390c683a96cd852081d743369';
const TRANSLATION_SLUG = 'ar-jesuit-dc';
const EXPECTED_BOOKS = [
  ['TOB', 14, 297], ['JDT', 16, 346], ['ESG', 7, 111], ['PS2', 1, 8], ['WIS', 19, 439],
  ['SIR', 51, 1590], ['BAR', 6, 214], ['1MA', 16, 929], ['2MA', 15, 558], ['DAG', 3, 207]
];
const SOURCE_NAME = 'الترجمة اليسوعية، روديه واليازجي، بيروت ١٨٧٦–١٨٨٠';
const SOURCE_NOTES = 'النص من الطبعة اليسوعية العربية في بيروت ١٨٧٦–١٨٨٠، أعدها أوغسطين روديه وإبراهيم اليازجي. التفريغ الرقمي جُلب من موقع الأنبا تكلا، ثم طوبق كاملاً مع ملف المصدر المراجع. نص الطبعة الأصلية من الملك العام؛ لا يتضمن هذا السجل تنسيق الموقع أو تعليقاته.';

async function readReviewedSource() {
  const raw = await readFile(SOURCE_FILE);
  const hash = createHash('sha256').update(raw).digest('hex');
  if (hash !== SOURCE_SHA256) throw new Error('بصمة ملف الترجمة اليسوعية لا تطابق النسخة المراجعة');
  const source = JSON.parse(raw.toString('utf8'));
  if (source.translation_slug !== TRANSLATION_SLUG || source.source_type !== 'public-domain-text'
    || source.language !== 'ar' || !Array.isArray(source.books) || source.books.length !== EXPECTED_BOOKS.length) {
    throw new Error('بيانات مصدر الترجمة اليسوعية غير مكتملة');
  }
  for (const [index, [code, chapterCount, unitCount]] of EXPECTED_BOOKS.entries()) {
    const book = source.books[index];
    if (book.code !== code || book.chapterCount !== chapterCount || book.unitCount !== unitCount
      || !isCompleteDeuteroBook(chapterCount, book.chapters)
      || book.chapters.reduce((total, chapter) => total + chapter.verses.length, 0) !== unitCount) {
      throw new Error(`ملف الترجمة اليسوعية لا يطابق السفر ${code}`);
    }
    for (const chapter of book.chapters) {
      if (chapter.verses.some((verse) => typeof verse.text !== 'string' || !verse.text.trim()
        || typeof verse.sourceUrl !== 'string' || !verse.sourceUrl.startsWith(source.source_url))) {
        throw new Error(`يوجد عدد بلا نص أو رابط مصدر في ${code} ${chapter.chapter}`);
      }
    }
  }
  return source;
}

function getSourceMismatch(db, source) {
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug=?
  `).get(TRANSLATION_SLUG);
  if (!translation || translation.language !== 'ar' || translation.is_active !== 1
    || translation.site_scope !== 'both' || translation.source_type !== 'public-domain-text') {
    return 'بيانات الترجمة أو نطاق إتاحتها غير مطابق';
  }

  for (const book of source.books) {
    const collection = db.prepare(`
      SELECT bc.site_scope FROM bible_books bb JOIN bible_collections bc ON bc.id=bb.collection_id
      WHERE bb.code=?
    `).get(book.code);
    const metadata = db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(book.code);
    if (collection?.site_scope !== 'both' || metadata?.text_status !== 'complete') {
      return `حالة السفر ${book.code}: النطاق=${collection?.site_scope ?? 'مفقود'}، الاكتمال=${metadata?.text_status ?? 'مفقود'}`;
    }
    const expected = book.chapters.flatMap((chapter) => chapter.verses.map((verse) => ({
      chapter: chapter.chapter, verse: verse.verse, text: verse.text, source_url: verse.sourceUrl
    })));
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, book.code);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      const mismatchIndex = expected.findIndex((row, index) => JSON.stringify(row) !== JSON.stringify(actual[index]));
      return `نص أو رابط مصدر غير مطابق في ${book.code}، العدد ${mismatchIndex + 1} (المتوقع ${expected.length}، الموجود ${actual.length})`;
    }
  }
  return null;
}

function sourceIsCurrent(db, source) {
  return getSourceMismatch(db, source) === null;
}

function importSource(db, source) {
  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, 'ar', ?, 'public-domain-text', ?, 'both', 1, 2)
    ON CONFLICT(slug) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en,
      abbreviation=excluded.abbreviation, language='ar', source_url=excluded.source_url,
      source_type='public-domain-text', source_notes=excluded.source_notes, site_scope='both', is_active=1
  `);
  insertTranslation.run(TRANSLATION_SLUG, source.name_ar, source.name_en, source.abbreviation, source.source_url, SOURCE_NOTES);
  const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(TRANSLATION_SLUG).id;
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse) DO UPDATE SET
      text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const updateMetadata = db.prepare(`
    UPDATE bible_book_metadata SET text_status='complete', arabic_status='available',
      source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?
  `);
  const updateBook = db.prepare('UPDATE bible_books SET chapter_count=? WHERE code=?');
  const upsertSource = db.prepare(`
    INSERT INTO bible_book_sources
      (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES (?, ?, ?, 'العربية', 'available', 'public-domain-text', ?, ?)
    ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
      label_en=excluded.label_en, availability_status='available', source_type='public-domain-text', notes=excluded.notes
  `);

  for (const book of source.books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        insertVerse.run(translationId, book.code, chapter.chapter, verse.verse,
          verse.text, normalizeArabicText(verse.text), verse.sourceUrl);
      }
    }
    updateMetadata.run(SOURCE_NAME, source.source_url, SOURCE_NOTES, book.code);
    updateBook.run(book.chapterCount, book.code);
    upsertSource.run(book.code, `النص العربي: ${book.nameAr}`, `${book.nameEn} Arabic text`, source.source_url, SOURCE_NOTES);
  }
  db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(translationId);
}

export async function ensureJesuitDeuterocanonImported() {
  const db = getDb();
  const source = await readReviewedSource();
  if (sourceIsCurrent(db, source)) return false;
  db.transaction(() => importSource(db, source))();
  const mismatch = getSourceMismatch(db, source);
  if (mismatch) throw new Error(`تعذر التحقق من استيراد الأسفار القانونية الثانية العشرة: ${mismatch}`);
  return true;
}
