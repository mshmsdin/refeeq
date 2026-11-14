import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../importers/data/ar-mohammad');

// ملفات الترجمات العربية الجاهزة: كل ملف عمل واحد بنصه العربي ووسيطه ووسم الترجمة.
function loadWorks() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR).filter((name) => name.endsWith('.json')).sort()
    .map((name) => ({ file: name, ...JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')) }));
}

function validate(work) {
  const { book_code: code, expected_units: expected, verses, arabic } = work;
  if (!code || !arabic?.slug || !Array.isArray(verses) || verses.length !== expected) {
    throw new Error(`بيانات الترجمة العربية ${work.file} ناقصة أو عدد وحداتها لا يطابق المتوقع`);
  }
  const seen = new Set();
  for (const verse of verses) {
    const key = `${verse.chapter}:${verse.verse}`;
    if (!Number.isInteger(verse.chapter) || !Number.isInteger(verse.verse) || !verse.text_ar?.trim() || seen.has(key)) {
      throw new Error(`وحدة ناقصة أو مكررة عند ${key} في ${work.file}`);
    }
    seen.add(key);
  }
}

function isReady(db, work) {
  const row = db.prepare(`
    SELECT bt.id, bt.name_ar, bt.source_type, bt.source_notes, bt.is_active, bt.site_scope
    FROM bible_translations bt WHERE bt.slug=?
  `).get(work.arabic.slug);
  if (!row || row.name_ar !== work.arabic.name_ar || row.source_type !== work.arabic.source_type
    || row.source_notes !== work.arabic.source_notes || row.is_active !== 1 || row.site_scope !== 'bible') return false;
  const actual = db.prepare(`
    SELECT chapter, verse, text FROM bible_verses WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(row.id, work.book_code);
  const expected = [...work.verses].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  return actual.length === expected.length
    && actual.every((item, index) => item.chapter === expected[index].chapter
      && item.verse === expected[index].verse && item.text === expected[index].text_ar);
}

export function ensureArabicTranslationsImported() {
  const db = getDb();
  const pending = loadWorks().filter((work) => { validate(work); return !isReady(db, work); });
  if (!pending.length) return [];

  const upsertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type,
       source_notes, site_scope, is_active, display_order, imported_at, updated_at)
    VALUES (?, ?, ?, ?, 'ar', ?, ?, ?, 'bible', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language='ar', source_url=excluded.source_url, source_type=excluded.source_type,
      source_notes=excluded.source_notes, site_scope='bible', is_active=1,
      display_order=excluded.display_order, updated_at=CURRENT_TIMESTAMP
  `);
  const deleteVerses = db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=?');
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const upsertBookSource = db.prepare(`
    INSERT INTO bible_book_sources (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES (?, ?, ?, 'ar', 'available', ?, ?, ?)
    ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
      label_en=excluded.label_en, availability_status='available', source_type=excluded.source_type, notes=excluded.notes
  `);

  const imported = [];
  db.transaction(() => {
    for (const work of pending) {
      if (!db.prepare('SELECT 1 FROM bible_books WHERE code=?').get(work.book_code)) {
        throw new Error(`السفر ${work.book_code} غير موجود في فهرس قاعدة البيانات`);
      }
      const t = work.arabic;
      upsertTranslation.run(t.slug, t.name_ar, t.name_en, t.abbreviation, t.source_url, t.source_type, t.source_notes, t.display_order);
      const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(t.slug).id;
      deleteVerses.run(id, work.book_code);
      for (const verse of work.verses) {
        insertVerse.run(id, work.book_code, verse.chapter, verse.verse, verse.text_ar, normalizeArabicText(verse.text_ar), t.source_url);
      }
      upsertBookSource.run(work.book_code, t.name_ar, t.name_en, t.source_type, t.source_url, t.source_notes);
      db.prepare("UPDATE bible_book_metadata SET arabic_status='available', updated_at=CURRENT_TIMESTAMP WHERE book_code=?").run(work.book_code);
      imported.push(work.book_code);
    }
  })();

  for (const work of pending) {
    if (!isReady(db, work)) throw new Error(`فشل التحقق بعد استيراد ${work.arabic.slug}`);
  }
  return imported;
}
