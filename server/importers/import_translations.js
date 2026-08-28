/**
 * Master Arabic Bible Importer (VPL Format)
 * Imports multiple Arabic translations from official eBible VPL archives:
 * 1. 'ar-svd'   - فان دايك (Arabic Van Dyck / Smith & Van Dyck 1865)
 * 2. 'ar-nav'   - كتاب الحياة (New Arabic Version / Ketab El Hayat - Biblica)
 * 3. 'ar-erv'   - الترجمة العربية المبسطة (Arabic Easy-to-Read Version - WBTC)
 *
 * Run: node server/importers/import_translations.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { initDatabase, getDb } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache');

const VPL_TO_DB_BOOK = {
  'GEN': 'GEN', 'EXO': 'EXO', 'LEV': 'LEV', 'NUM': 'NUM', 'DEU': 'DEU',
  'JOS': 'JOS', 'JDG': 'JDG', 'RUT': 'RUT', '1SA': '1SA', '2SA': '2SA',
  '1KI': '1KI', '2KI': '2KI', '1CH': '1CH', '2CH': '2CH', 'EZR': 'EZR',
  'NEH': 'NEH', 'EST': 'EST', 'JOB': 'JOB', 'PSA': 'PSA', 'PRO': 'PRO',
  'ECC': 'ECC', 'SOL': 'SNG', 'SNG': 'SNG', 'ISA': 'ISA', 'JER': 'JER',
  'LAM': 'LAM', 'EZE': 'EZK', 'EZK': 'EZK', 'DAN': 'DAN', 'HOS': 'HOS',
  'JOE': 'JOL', 'JOL': 'JOL', 'AMO': 'AMO', 'OBA': 'OBA', 'JON': 'JON',
  'MIC': 'MIC', 'NAH': 'NAM', 'NAM': 'NAM', 'HAB': 'HAB', 'ZEP': 'ZEP',
  'HAG': 'HAG', 'ZEC': 'ZEC', 'MAL': 'MAL',
  'MAT': 'MAT', 'MAR': 'MRK', 'MRK': 'MRK', 'LUK': 'LUK', 'JOH': 'JHN',
  'JHN': 'JHN', 'ACT': 'ACT', 'ROM': 'ROM', '1CO': '1CO', '2CO': '2CO',
  'GAL': 'GAL', 'EPH': 'EPH', 'PHI': 'PHP', 'PHP': 'PHP', 'COL': 'COL',
  '1TH': '1TH', '2TH': '2TH', '1TI': '1TI', '2TI': '2TI', 'TIT': 'TIT',
  'PHM': 'PHM', 'HEB': 'HEB', 'JAM': 'JAS', 'JAS': 'JAS', '1PE': '1PE',
  '2PE': '2PE', '1JO': '1JN', '1JN': '1JN', '2JO': '2JN', '2JN': '2JN',
  '3JO': '3JN', '3JN': '3JN', 'JUD': 'JUD', 'REV': 'REV'
};

const TRANSLATIONS = [
  {
    slug: 'ar-svd',
    name_ar: 'ترجمة فان دايك (البستاني - سميث)',
    name_en: 'Arabic Van Dyck (SVD)',
    abbreviation: 'SVD',
    display_order: 1,
    url: 'https://ebible.org/Scriptures/arb-vd_vpl.zip',
    filename: 'arb-vd_vpl.zip',
    source_notes: 'الترجمة العربية البروتستانتية القياسية الشهيرة 1865'
  },
  {
    slug: 'ar-nav',
    name_ar: 'كتاب الحياة (الترجمة التفسيرية)',
    name_en: 'New Arabic Version (Ketab El Hayat)',
    abbreviation: 'NAV',
    display_order: 2,
    url: 'https://ebible.org/Scriptures/arbnav_vpl.zip',
    filename: 'arbnav_vpl.zip',
    source_notes: 'ترجمة كتاب الحياة المعاصرة - دار الكتاب المقدس / Biblica'
  },
  {
    slug: 'ar-erv',
    name_ar: 'الترجمة العربية المبسطة (العالمية)',
    name_en: 'Arabic Easy-to-Read Version (ERV)',
    abbreviation: 'ERV',
    display_order: 3,
    url: 'https://ebible.org/Scriptures/arbwbtc_vpl.zip',
    filename: 'arbwbtc_vpl.zip',
    source_notes: 'الترجمة العربية المبسطة - مركز ترجمة الكتاب المقدس العالمي WBTC'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
      console.log(`  [cache] Using cached ${path.basename(dest)}`);
      return resolve();
    }
    console.log(`  [download] Fetching ${url}...`);
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    const request = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    request.on('error', err => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function parseVplContent(txt) {
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const verses = [];

  for (const line of lines) {
    // Standard VPL format: "GEN 1:1 فِي ٱلْبَدْءِ..."
    const m = line.match(/^(\S+)\s+(\d+):(\d+)\s+(.*)/);
    if (!m) continue;

    const rawCode = m[1].toUpperCase();
    const chapter = parseInt(m[2]);
    const verse = parseInt(m[3]);
    const text = m[4].trim();

    const bookCode = VPL_TO_DB_BOOK[rawCode] || rawCode;
    if (!text) continue;

    verses.push({ bookCode, chapter, verse, text });
  }

  return verses;
}

export async function importAllTranslations() {
  initDatabase();
  initBibleSchema();
  const db = getDb();

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text = excluded.text, search_text = excluded.search_text, imported_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((rows) => {
    for (const r of rows) insertVerse.run(...r);
  });

  for (const t of TRANSLATIONS) {
    console.log(`\n========================================`);
    console.log(`Importing: ${t.name_ar} (${t.slug})`);
    console.log(`========================================`);

    // Ensure translation row exists
    db.prepare(`
      INSERT INTO bible_translations (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, is_active, display_order)
      VALUES (?, ?, ?, ?, 'ar', ?, 'vpl', ?, 1, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name_ar = excluded.name_ar,
        name_en = excluded.name_en,
        abbreviation = excluded.abbreviation,
        display_order = excluded.display_order,
        source_notes = excluded.source_notes
    `).run(t.slug, t.name_ar, t.name_en, t.abbreviation, t.url, t.source_notes, t.display_order);

    const transRow = db.prepare('SELECT id FROM bible_translations WHERE slug = ?').get(t.slug);
    const translationId = transRow.id;

    const zipPath = path.join(CACHE_DIR, t.filename);
    await download(t.url, zipPath);

    const zip = new AdmZip(zipPath);
    const vplEntry = zip.getEntries().find(e => e.entryName.endsWith('_vpl.txt') || e.entryName.endsWith('.txt'));

    if (!vplEntry) {
      console.error(`  [!] Could not find VPL text file inside ${t.filename}`);
      continue;
    }

    console.log(`  Parsing ${vplEntry.entryName}...`);
    const txtContent = zip.readAsText(vplEntry);
    const parsedVerses = parseVplContent(txtContent);

    console.log(`  Parsed ${parsedVerses.length} verses. Inserting into database...`);

    // Batch insert
    const rows = parsedVerses.map(v => [
      translationId,
      v.bookCode,
      v.chapter,
      v.verse,
      v.text,
      normalizeArabicText(v.text),
      t.url
    ]);

    // Chunk insertion for SQLite performance
    const chunkSize = 2000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      insertMany(rows.slice(i, i + chunkSize));
    }

    db.prepare('UPDATE bible_translations SET imported_at = CURRENT_TIMESTAMP WHERE id = ?').run(translationId);

    // Update chapter counts on books
    const chapCounts = db.prepare(`
      SELECT book_code, MAX(chapter) as max_ch FROM bible_verses WHERE translation_id = ? GROUP BY book_code
    `).all(translationId);

    const updateBook = db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code = ?');
    for (const r of chapCounts) {
      updateBook.run(r.max_ch, r.max_ch, r.book_code);
    }

    console.log(`  ✅ Successfully imported ${rows.length} verses for ${t.name_ar}!`);
  }

  // Update total stats
  const totalCount = db.prepare('SELECT COUNT(*) as c FROM bible_verses').get();
  console.log(`\n========================================`);
  console.log(`All Translations Import Complete! Total verses in DB: ${totalCount.c}`);
  console.log(`========================================\n`);
}

// Run directly
importAllTranslations().catch(err => {
  console.error('[Import Error]', err);
  process.exit(1);
});
