/**
 * Arabic Deuterocanonical / Apocrypha Importer
 * Source: St-Takla.org using their BibleSearch API
 * API: https://st-takla.org/Bibles/BibleSearch/showChapter.php?book=17&chapter=1
 *
 * St-Takla book number mapping:
 *   17=Tobit, 18=Judith, 19=Esther (with Greek additions), 23=Psalm 151,
 *   27=Wisdom, 28=Sirach, 32=Baruch, 48=1 Maccabees, 49=2 Maccabees.
 *
 * Run: node server/importers/import_deutero.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache', 'deutero-html');
const TRANSLATION_SLUG = 'ar-jesuit-dc';
const BASE_URL = 'https://st-takla.org/Bibles/BibleSearch/showChapter.php';

// St-Takla numeric book IDs for Deuterocanon
const BOOK_SOURCES = [
  { code: 'TOB', bookId: 17, chapters: 14, name: 'طوبيا' },
  { code: 'JDT', bookId: 18, chapters: 16, name: 'يهوديت' },
  { code: 'ESG', bookId: 20, chapters: 7, sourceChapterStart: 10, name: 'تتمة أستير (اليونانية)' },
  { code: 'PS2', bookId: 23, chapters: 1, name: 'المزمور 151' },
  { code: 'WIS', bookId: 27, chapters: 19, name: 'الحكمة' },
  { code: 'SIR', bookId: 28, chapters: 51, name: 'ابن سيراخ' },
  { code: 'BAR', bookId: 32, chapters: 6,  name: 'باروخ' },
  { code: '1MA', bookId: 48, chapters: 16, name: 'المكابيين الأول' },
  { code: '2MA', bookId: 49, chapters: 15, name: 'المكابيين الثاني' },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BibleResearch/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en'
      }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

async function fetchCached(url, cacheKey) {
  const cachePath = path.join(CACHE_DIR, cacheKey + '.html');
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  const html = await fetchUrl(url);
  fs.writeFileSync(cachePath, html, 'utf8');
  await new Promise(r => setTimeout(r, 700));
  return html;
}

/**
 * Extract Arabic verse text from St-Takla BibleSearch HTML response.
 * The page contains verse blocks. We look for numbered verse patterns.
 */
function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function extractVerses(html) {
  const structured = [];
  const versePattern = /<div[^>]*data-usfm="[^".]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = versePattern.exec(html))) {
    const verseText = decodeHtml(match[3])
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t\r\n]+/g, ' ')
      .trim();
    const verseNum = Number(match[2]);
    if (verseNum > 0 && verseText.length >= 5 && /[\u0600-\u06FF]/.test(verseText)) {
      structured.push({ chapter: Number(match[1]), verse: verseNum, text: verseText });
    }
  }
  if (structured.length) return structured;

  const verses = [];

  // Remove scripts, styles, comments
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert to plain text
  const text = clean
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/td>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ');

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines) {
    // Pattern: starts with verse number then text
    // e.g. "1 في أيام عحشورش" or "١ في أيام"
    const m = line.match(/^(\d+)\s+(.{5,})/);
    if (!m) continue;
    const verseNum = parseInt(m[1]);
    const verseText = m[2].trim();
    if (verseNum < 1 || verseNum > 200) continue;
    if (!/[\u0600-\u06FF]/.test(verseText)) continue;
    if (verseText.length < 10) continue;
    verses.push({ verse: verseNum, text: verseText });
  }

  // Deduplicate (same verse number keep first)
  const seen = new Set();
  return verses.filter(v => {
    if (seen.has(v.verse)) return false;
    seen.add(v.verse);
    return true;
  }).sort((a, b) => a.verse - b.verse).map((verse) => ({ chapter: null, ...verse }));
}

async function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Ensure translation record
  db.prepare(`
    INSERT OR IGNORE INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, 2)
    ON CONFLICT(slug) DO UPDATE SET site_scope='bible', is_active=1
  `).run(
    TRANSLATION_SLUG,
    'الترجمة اليسوعية (القانونيات الثانية)',
    'Jesuit Arabic Translation — Deuterocanon (1877)',
    'DC-JES', 'ar',
    'https://st-takla.org/Bibles/BibleSearch/showChapter.php',
    'html',
    'مأخوذة من موقع الأنبا تكلا — مستمدة من الترجمة اليسوعية العربية 1877'
  );

  const trans = db.prepare('SELECT id FROM bible_translations WHERE slug = ?').get(TRANSLATION_SLUG);
  const translationId = trans.id;

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, imported_at=CURRENT_TIMESTAMP
  `);
  const insertMany = db.transaction((rows) => { for (const r of rows) insertVerse.run(...r); });

  let totalBooks = 0, totalVerses = 0, errors = [];

  for (const book of BOOK_SOURCES) {
    let bookVerses = 0;
    console.log(`\n[DC] ${book.code} — ${book.name} (${book.chapters} chapters)`);

    for (let ch = 1; ch <= book.chapters; ch++) {
      const sourceChapter = (book.sourceChapterStart || 1) + ch - 1;
      const url = `${BASE_URL}?book=${book.bookId}&chapter=${sourceChapter}`;
      const cacheKey = `${book.code}_${book.bookId}_ch${sourceChapter}`;
      let html;

      try {
        html = await fetchCached(url, cacheKey);
      } catch (e) {
        errors.push(`Failed: ${url} — ${e.message}`);
        continue;
      }

      const verses = extractVerses(html);
      if (verses.length === 0) {
        errors.push(`No verses extracted: ${url}`);
        // Remove bad cache file so it will re-fetch
        const cachePath = path.join(CACHE_DIR, cacheKey + '.html');
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        continue;
      }

      const rows = verses.map(v => [
        translationId, book.code, ch, v.verse,
        v.text, normalizeArabicText(v.text), url
      ]);

      insertMany(rows);
      bookVerses += rows.length;
      process.stdout.write('.');
    }

    console.log(`\n  ${book.code}: ${bookVerses} verses`);
    totalVerses += bookVerses;
    if (bookVerses > 0) {
      totalBooks++;
      db.prepare(`
        UPDATE bible_book_metadata
        SET text_status='complete', arabic_status='available', source_name=?, source_url=?, updated_at=CURRENT_TIMESTAMP
        WHERE book_code=?
      `).run('موقع الأنبا تكلا — الترجمة اليسوعية', BASE_URL, book.code);
      db.prepare(`
        INSERT OR IGNORE INTO bible_book_sources
          (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
        VALUES (?, ?, ?, 'العربية', 'available', 'html', ?, ?)
      `).run(book.code, `النص العربي: ${book.name}`, `Arabic text: ${book.name}`, BASE_URL, 'استُوردت وحدات النص وفُحصت بنيتها قبل إدخالها.');
    }
  }

  // Update chapter counts
  const chapCounts = db.prepare(`
    SELECT book_code, MAX(chapter) as max_ch FROM bible_verses
    WHERE translation_id = ? GROUP BY book_code
  `).all(translationId);
  const updateBook = db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code = ?');
  for (const r of chapCounts) updateBook.run(r.max_ch, r.max_ch, r.book_code);

  db.prepare('UPDATE bible_translations SET imported_at = CURRENT_TIMESTAMP WHERE id = ?').run(translationId);

  console.log('\n=== Deuterocanon Import Summary ===');
  console.log(`Translation: ${TRANSLATION_SLUG}`);
  console.log(`Books: ${totalBooks}`);
  console.log(`Verses: ${totalVerses}`);
  if (errors.length) {
    console.log(`Errors (${errors.length}):`);
    errors.slice(0, 30).forEach(e => console.log('  ' + e));
  } else {
    console.log('Errors: 0');
  }
}

run().catch(err => { console.error('[DC Import Error]', err.message); process.exit(1); });
