import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../importers/data/1es-mohammad-parallel.json');
const DATA = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const EXPECTED_CHAPTER_COUNTS = [58, 30, 24, 63, 73, 34, 15, 96, 55];

function validateData() {
  if (DATA.book_code !== '1ES' || DATA.expected_units !== 448 || DATA.verses.length !== 448) {
    throw new Error('بيانات عزرا الأول لا تحتوي 448 وحدة كما هو متوقع');
  }

  const seen = new Set();
  const counts = Array(9).fill(0);
  for (const verse of DATA.verses) {
    const key = `${verse.chapter}:${verse.verse}`;
    if (!Number.isInteger(verse.chapter) || verse.chapter < 1 || verse.chapter > 9
      || !Number.isInteger(verse.verse) || !verse.text_ar?.trim() || !verse.text_grc?.trim()
      || seen.has(key)) {
      throw new Error(`بيانات عزرا الأول ناقصة أو مكررة عند ${key}`);
    }
    seen.add(key);
    counts[verse.chapter - 1] += 1;
  }

  if (counts.some((count, index) => count !== EXPECTED_CHAPTER_COUNTS[index])) {
    throw new Error('توزيع وحدات عزرا الأول على الإصحاحات غير مطابق للمصدر');
  }
}

function translationMatches(db, translation) {
  const current = db.prepare(`
    SELECT id, name_ar, name_en, abbreviation, language, source_url, source_type,
      source_notes, site_scope, is_active
    FROM bible_translations WHERE slug=?
  `).get(translation.slug);
  if (!current || current.name_ar !== translation.name_ar || current.name_en !== translation.name_en
    || current.abbreviation !== translation.abbreviation || current.language !== translation.language
    || current.source_url !== translation.source_url || current.source_type !== translation.source_type
    || current.source_notes !== translation.source_notes || current.site_scope !== 'bible'
    || current.is_active !== 1) return false;

  const actual = db.prepare(`
    SELECT chapter, verse, text FROM bible_verses
    WHERE translation_id=? AND book_code='1ES' ORDER BY chapter, verse
  `).all(current.id);
  if (actual.length !== DATA.verses.length) return false;

  const textField = translation.language === 'ar' ? 'text_ar' : 'text_grc';
  return actual.every((row, index) => row.chapter === DATA.verses[index].chapter
    && row.verse === DATA.verses[index].verse && row.text === DATA.verses[index][textField]);
}

validateData();

export function ensure1EsMohammadImported() {
  const db = getDb();
  const translations = [DATA.arabic, DATA.greek];
  if (translations.every((translation) => translationMatches(db, translation))) return false;

  const upsertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type,
       source_notes, site_scope, is_active, display_order, imported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
      source_notes=excluded.source_notes, site_scope='bible', is_active=1,
      display_order=excluded.display_order, updated_at=CURRENT_TIMESTAMP
  `);
  const deleteVerses = db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=?');
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, '1ES', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const upsertBookSource = db.prepare(`
    INSERT INTO bible_book_sources
      (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES ('1ES', ?, ?, ?, 'available', ?, ?, ?)
    ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
      label_en=excluded.label_en, availability_status='available', source_type=excluded.source_type,
      notes=excluded.notes
  `);

  db.transaction(() => {
    if (!db.prepare("SELECT 1 FROM bible_books WHERE code='1ES'").get()) {
      throw new Error('سفر عزرا الأول غير موجود في فهرس قاعدة البيانات');
    }

    for (const translation of translations) {
      upsertTranslation.run(
        translation.slug, translation.name_ar, translation.name_en, translation.abbreviation,
        translation.language, translation.source_url, translation.source_type,
        translation.source_notes, translation.display_order
      );
      const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(translation.slug).id;
      deleteVerses.run(translationId, DATA.book_code);
      const field = translation.language === 'ar' ? 'text_ar' : 'text_grc';
      for (const verse of DATA.verses) {
        const searchText = translation.language === 'ar'
          ? normalizeArabicText(verse[field])
          : verse[field].normalize('NFC').toLocaleLowerCase('el');
        const verseSourceUrl = translation.language === 'grc'
          ? `https://ebible.org/grcbrent/1ES${String(verse.chapter).padStart(2, '0')}.htm`
          : translation.source_url;
        insertVerse.run(translationId, verse.chapter, verse.verse, verse[field], searchText, verseSourceUrl);
      }
    }

    upsertBookSource.run(
      'الشاهد الإنجليزي الوسيط: العالم الإنجليزي الكلاسيكي', 'World English Bible Classic', 'en',
      'translation-source', DATA.arabic.source_url,
      'استُخدم هذا الشاهد المعروف باللغة الإنجليزية وسيطاً للترجمة العربية؛ طوبقت وحداته الـ٤٤٨ مع النص المسجل في قاعدة رفيق.'
    );
    upsertBookSource.run(
      'الشاهد اليوناني: طبعة برنتون للسُّبعينية (1851)', 'Brenton Septuagint Greek', 'grc',
      'parallel-text', DATA.greek.source_url,
      'النص اليوناني الكامل الباقي بحسب برنتون، منشور كملك عام. أُصلح سقط رقمي معروف في العدد ٨:١٨ بعبارة موثقة في النص المطبوع. أصل تأليف السفر محل نقاش.'
    );
    db.prepare(`
      UPDATE bible_books SET chapter_count=9 WHERE code='1ES'
    `).run();
    db.prepare(`
      UPDATE bible_book_metadata
      SET arabic_status='available', english_status='available',
          source_name='World English Bible Classic; Brenton Greek Septuagint (1851)',
          source_url=?,
          source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code='1ES'
    `).run(DATA.arabic.source_url,
      'تتوفر ترجمة عربية بعنوان «ترجمة محمد بن شمس الدين»، من وسيط إنجليزي، مع الشاهد اليوناني الكامل الباقي من برنتون. أصل تأليف السفر محل نقاش؛ أُصلح سقط رقمي معروف في النص اليوناني عند ٨:١٨.'
    );
  })();

  for (const translation of translations) {
    if (!translationMatches(db, translation)) {
      throw new Error(`فشل التحقق بعد استيراد ${translation.slug}`);
    }
  }
  return true;
}
