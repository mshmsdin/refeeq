/**
 * Arabic Van Dyck Bible Importer — Fixed for actual eBible arb-vd ReadAloud format
 * File format: arb-vd_NNN_BOOK_CH_read.txt
 * Each file = one chapter. Line 1 = chapter title. Lines 2+ = verses as "N.\ntext" or "N. text"
 *
 * Run: node server/importers/import_svd.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { initDatabase, getDb } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const CACHE_ZIP = path.join(CACHE_DIR, 'arb-vd.zip');
const CACHE_DIR_EXTRACTED = path.join(CACHE_DIR, 'arb-vd');

const SOURCE_URL = 'https://ebible.org/Scriptures/arb-vd_readaloud.zip';
const TRANSLATION_SLUG = 'ar-svd';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { return resolve(); }
    console.log(`  [download] ${url}`);
    const file = createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    const request = proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { file.close(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    request.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    request.setTimeout(120000, () => { request.destroy(); reject(new Error('Download timeout')); });
  });
}

/**
 * Parse a ReadAloud chapter file.
 * Format:
 *   Line 0: Chapter title (e.g. "اَلتَّكْوِينُ.")
 *   Line 1: "1." (marks start of verse 1)
 *   Lines 2+: One Arabic verse text per line, sequentially
 *   Occasionally a line like "3." resets verse counter (rare multi-start)
 */
function parseChapterFile(content) {
  content = content.replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const verses = [];
  let verseNum = 0;
  let started = false;

  for (const line of lines) {
    // Pure verse number marker: "N."
    const numMarker = line.match(/^(\d+)\.$/)
    if (numMarker) {
      verseNum = parseInt(numMarker[1]);
      started = true;
      continue;
    }

    // Skip chapter title (first non-empty line before "1.")
    if (!started) continue;

    // Skip lines that are just punctuation or too short
    if (line.length < 3) continue;

    // Must contain Arabic
    if (!/[\u0600-\u06FF]/.test(line)) continue;

    verses.push({ verse: verseNum, text: line });
    verseNum++;
  }

  return verses;
}


async function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();

  // Ensure translation record
  db.prepare(`
    INSERT OR IGNORE INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
  `).run(TRANSLATION_SLUG, 'فان دايك', 'Arabic Van Dyck (Smith-Van Dyck)', 'SVD', 'ar', SOURCE_URL, 'structured-file');

  const trans = db.prepare('SELECT id FROM bible_translations WHERE slug = ?').get(TRANSLATION_SLUG);
  const translationId = trans.id;

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  await download(SOURCE_URL, CACHE_ZIP);

  if (!fs.existsSync(CACHE_DIR_EXTRACTED)) {
    console.log('  [extract] arb-vd.zip');
    const zip = new AdmZip(CACHE_ZIP);
    zip.extractAllTo(CACHE_DIR_EXTRACTED, true);
  }

  // Group files by book
  const txtFiles = fs.readdirSync(CACHE_DIR_EXTRACTED)
    .filter(f => f.match(/^arb-vd_\d+_\w+_\d+_read\.txt$/))
    .sort();

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, imported_at=CURRENT_TIMESTAMP
  `);
  const insertMany = db.transaction((rows) => { for (const r of rows) insertVerse.run(...r); });

  // Get valid book codes from DB
  const validBooks = new Set(db.prepare('SELECT code FROM bible_books').all().map(r => r.code));

  // Track per-book totals
  const bookStats = {};
  let totalVerses = 0, errors = [];

  for (const file of txtFiles) {
    // Extract book code and chapter from filename: arb-vd_002_GEN_01_read.txt
    const m = file.match(/arb-vd_\d+_(\w+)_(\d+)_read\.txt/);
    if (!m) continue;
    const rawCode = m[1].toUpperCase();
    const chapter = parseInt(m[2]);

    // Map numeric codes if needed
    let bookCode = rawCode;
    // eBible uses standard USFM codes, just uppercase
    if (!validBooks.has(bookCode)) {
      errors.push(`Unknown book code in file: ${file} (code: ${bookCode})`);
      continue;
    }

    const content = fs.readFileSync(path.join(CACHE_DIR_EXTRACTED, file), 'utf8');
    const verses = parseChapterFile(content);

    if (verses.length === 0) {
      errors.push(`No verses parsed: ${file}`);
      continue;
    }

    const rows = verses
      .filter(v => v.text && v.text.length > 2)
      .map(v => [translationId, bookCode, chapter, v.verse, v.text, normalizeArabicText(v.text), SOURCE_URL]);

    if (rows.length > 0) {
      insertMany(rows);
      totalVerses += rows.length;
      if (!bookStats[bookCode]) bookStats[bookCode] = { chapters: 0, verses: 0 };
      bookStats[bookCode].chapters++;
      bookStats[bookCode].verses += rows.length;
    }
  }

  // Print per-book summary
  for (const [code, s] of Object.entries(bookStats)) {
    console.log(`  [SVD] ${code}: ${s.chapters} chapters, ${s.verses} verses`);
  }

  // Update chapter counts
  const chapCounts = db.prepare(`
    SELECT book_code, MAX(chapter) as max_ch FROM bible_verses WHERE translation_id = ? GROUP BY book_code
  `).all(translationId);
  const updateBook = db.prepare('UPDATE bible_books SET chapter_count = ? WHERE code = ?');
  for (const r of chapCounts) updateBook.run(r.max_ch, r.book_code);

  db.prepare('UPDATE bible_translations SET imported_at = CURRENT_TIMESTAMP WHERE id = ?').run(translationId);

  console.log('\n=== SVD Import Summary ===');
  console.log(`Translation: ${TRANSLATION_SLUG}`);
  console.log(`Books: ${Object.keys(bookStats).length}`);
  console.log(`Verses: ${totalVerses}`);
  if (errors.length) { console.log(`Errors (${errors.length}):`); errors.slice(0, 20).forEach(e => console.log('  ' + e)); }
  else console.log('Errors: 0');
}

run().catch(err => { console.error('[SVD Import Error]', err.message); process.exit(1); });
