/**
 * استيراد النصوص الإنجليزية العامة التي نحتاجها للنسخة المستقلة من البيبل.
 *
 * المصادر:
 * - برنتون للسُّبعينية من eBible.
 * - البيبل العالمي الكلاسيكي، مع عزرا الثاني عند توفره.
 *
 * لا يكتب هذا المستورد في رفيق: كل ترجمة تحمل site_scope = bible.
 * التشغيل:
 *   node server/importers/import_expansion_sources.js
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

const SOURCES = [
  {
    slug: 'en-brenton',
    name_ar: 'ترجمة برنتون الإنجليزية للسُّبعينية',
    name_en: 'Brenton English Septuagint',
    abbreviation: 'LXX-EN',
    url: 'https://ebible.org/Scriptures/eng-Brenton_vpl.zip',
    filename: 'eng-Brenton_vpl.zip',
    notes: 'ترجمة إنجليزية للسُّبعينية؛ تسجل كطبعة موازية ولا تستبدل الشاهد اليوناني.'
  },
  {
    slug: 'en-web',
    name_ar: 'البيبل العالمي الكلاسيكي',
    name_en: 'World English Bible Classic',
    abbreviation: 'WEB',
    url: 'https://ebible.org/Scriptures/eng-web_vpl.zip',
    filename: 'eng-web_vpl.zip',
    notes: 'ترجمة إنجليزية عامة؛ تستخدم أيضاً لاستكمال الأعمال التي لا يتوفر لها عربي، ومنها عزرا الثاني عند وجوده في المصدر.'
  },
  {
    slug: 'la-vulgate',
    name_ar: 'الفولجاتا اللاتينية الكليمنتية',
    name_en: 'Clementine Vulgate 1598',
    abbreviation: 'VUL-LA',
    language: 'la',
    url: 'https://ebible.org/Scriptures/latVUC_vpl.zip',
    filename: 'latVUC_vpl.zip',
    notes: 'النص اللاتيني للفولجاتا الكليمنتية المنشورة سنة 1598 من مصدر البيبل، يحفظ كتقليد نصي موازٍ ولا يستبدل الترجمات العربية أو الإنجليزية.'
  }
];

const HTML_SOURCES = [
  {
    bookCode: 'MAN',
    url: 'https://ebible.org/eng-web/MAN01.htm',
    notes: 'World English Bible Classic؛ صفحة صلاة منسى، والنص معلن في المصدر ملكاً عاماً.'
  }
];

const PESHITTA_FILES = [
  ['MAT', '40_Matthieu.usfm'], ['MRK', '41_Marc.usfm'], ['LUK', '42_Luc.usfm'], ['JHN', '43_Jean.usfm'],
  ['ACT', '44_Actes.usfm'], ['ROM', '45_Romains.usfm'], ['1CO', '46_1_Corinthiens.usfm'], ['2CO', '47_2_Corinthiens.usfm'],
  ['GAL', '48_Galates.usfm'], ['EPH', '49_Éphésiens.usfm'], ['PHP', '50_Philippiens.usfm'], ['COL', '51_Colossiens.usfm'],
  ['1TH', '52_1_Thessaloniens.usfm'], ['2TH', '53_2_Thessaloniens.usfm'], ['1TI', '54_1_Timothée.usfm'], ['2TI', '55_2_Timothée.usfm'],
  ['TIT', '56_Tite.usfm'], ['PHM', '57_Philémon.usfm'], ['HEB', '58_Hébreux.usfm'], ['JAS', '59_Jacques.usfm'],
  ['1PE', '60_1_Pierre.usfm'], ['2PE', '61_2_Pierre.usfm'], ['1JN', '62_1_Jean.usfm'], ['2JN', '63_2_Jean.usfm'],
  ['3JN', '64_3_Jean.usfm'], ['JUD', '65_Jude.usfm'], ['REV', '66_Apocalypse.usfm']
];

const SAMARITAN_SOURCE = {
  slug: 'en-samaritan-pentateuch',
  name_ar: 'الترجمة الإنجليزية للتوراة السامرية',
  name_en: 'Samaritan Pentateuch in English',
  abbreviation: 'SAM-EN',
  language: 'en',
  url: 'https://gitlab.com/crosswire-bible-society/spe/-/raw/main/spe.osis.xml',
  source_type: 'osis',
  notes: 'ترجمة إنجليزية منشورة في وحدة جمعية كروس واير، مبنية على نص السامري ومعلنة في وصف الوحدة بوصفها ترجمة إنجليزية؛ تحفظ الأسفار الخمسة في سجلات مستقلة، ولا تستبدل النص السامري الأصلي أو الترجمة العربية المستقبلية.'
};

function download(url, destination) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destination) && fs.statSync(destination).size > 100000) return resolve();
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destination);
    const request = protocol.get(url, { headers: { 'User-Agent': 'Rafeeq-Bible-Importer/1.0' } }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        file.close();
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
        return download(response.headers.location, destination).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    request.on('error', (error) => {
      file.close();
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
      reject(error);
    });
    request.setTimeout(120000, () => request.destroy(new Error(`انتهت مهلة تنزيل ${url}`)));
  });
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Rafeeq-Bible-Importer/1.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function decodeHtml(text) {
  const named = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…'
  };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&([a-z]+);/gi, (_, name) => named[name.toLowerCase()] ?? `&${name};`);
}

function parseHtmlVerses(content) {
  const rows = [];
  const pattern = /<span\s+class=["']verse["'][^>]*id=["']V(\d+)["'][^>]*>[\s\S]*?<\/span>([\s\S]*?)(?=<span\s+class=["']verse["']|<\/div>)/gi;
  for (const match of content.matchAll(pattern)) {
    const verse = Number(match[1]);
    const text = decodeHtml(match[2]
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim());
    if (verse && text) rows.push({ chapter: 1, verse, text });
  }
  return rows;
}

const BOOK_CODE_MAP = {
  MAR: 'MRK', JOH: 'JHN', JAM: 'JAS', JOE: 'JOL', NAH: 'NAM', EZE: 'EZK',
  PHI: 'PHP', '1JO': '1JN', '2JO': '2JN', '3JO': '3JN', SOL: 'SNG',
  PSA151: 'PS2', PS151: 'PS2', ESTG: 'ESG', DANG: 'DAG', '4ES': '2ES'
};

function parseVpl(content, validBooks) {
  const rows = [];
  for (const rawLine of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(\S+)\s+(\d+):(\d+)\s+(.+)$/);
    if (!match) continue;
    const rawCode = match[1].toUpperCase();
    const bookCode = BOOK_CODE_MAP[rawCode] || rawCode;
    const chapter = Number(match[2]);
    const verse = Number(match[3]);
    const text = match[4].trim();
    if (!validBooks.has(bookCode) || !text || !chapter || !verse) continue;
    rows.push({ bookCode, chapter, verse, text });
  }
  return rows;
}

function parseUsfm(content, bookCode) {
  let chapter = 0;
  const rows = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const chapterMatch = rawLine.match(/^\\c\s+(\d+)/);
    if (chapterMatch) {
      chapter = Number(chapterMatch[1]);
      continue;
    }
    const verseMatch = rawLine.match(/^\\v\s+(\d+)\s+(.+)$/);
    if (!verseMatch || !chapter) continue;
    const text = verseMatch[2]
      .replace(/\\f\s+[\s\S]*?\\f\*/g, '')
      .replace(/\\x\s+[\s\S]*?\\x\*/g, '')
      .replace(/\\[a-z0-9-]+\*?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) rows.push({ bookCode, chapter, verse: Number(verseMatch[1]), text });
  }
  return rows;
}

function parseSamaritanOsis(content) {
  const bookMap = { Gen: 'SAM-GEN', Exod: 'SAM-EXO', Lev: 'SAM-LEV', Num: 'SAM-NUM', Deut: 'SAM-DEU' };
  const rows = [];
  const pattern = /<verse\s+sID="([^"]+)\.(\d+)\.(\d+)"[^>]*\/>[\s\S]*?<verse\s+eID="\1\.\2\.\3"[^>]*\/>/gi;
  for (const match of content.matchAll(pattern)) {
    const osisBook = match[1];
    const bookCode = bookMap[osisBook];
    if (!bookCode) continue;
    const text = decodeHtml(match[0]
      .replace(/^[\s\S]*?\/>/, '')
      .replace(/<verse\s+eID="[^"]+"[^>]*\/>[\s\S]*$/i, '')
      .replace(/<note\b[\s\S]*?<\/note>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim());
    if (text) rows.push({ bookCode, chapter: Number(match[2]), verse: Number(match[3]), text });
  }
  if (rows.length < 5000) throw new Error(`اكتُشفت ${rows.length} وحدة فقط في التوراة السامرية، والمتوقع أكثر من ٥٠٠٠`);
  return rows;
}

async function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const validBooks = new Set(db.prepare('SELECT code FROM bible_books').all().map((row) => row.code));
  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      source_url=excluded.source_url, source_notes=excluded.source_notes, site_scope='bible', is_active=1
  `);
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertMany = db.transaction((rows) => rows.forEach((row) => insertVerse.run(...row)));

  for (const [index, source] of SOURCES.entries()) {
    const translationId = insertTranslation.run(
      source.slug, source.name_ar, source.name_en, source.abbreviation, source.language || 'en',
      source.url, source.source_type || 'vpl', source.notes, 20 + index
    ).lastInsertRowid || db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id;
    const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id || translationId;
    const zipPath = path.join(CACHE_DIR, source.filename);
    await download(source.url, zipPath);
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find((item) => item.entryName.endsWith('_vpl.txt') || item.entryName.endsWith('.txt'));
    if (!entry) throw new Error(`لم يوجد ملف نصي بصيغة VPL داخل ${source.filename}`);
    const parsed = parseVpl(zip.readAsText(entry), validBooks);
    const rows = parsed.map((verse) => [
      id, verse.bookCode, verse.chapter, verse.verse, verse.text,
      normalizeArabicText(verse.text), source.url
    ]);
    for (let offset = 0; offset < rows.length; offset += 2000) insertMany(rows.slice(offset, offset + 2000));
    const chaptersByBook = new Map();
    for (const verse of parsed) {
      chaptersByBook.set(verse.bookCode, Math.max(chaptersByBook.get(verse.bookCode) || 0, verse.chapter));
    }
    const updateBook = db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code = ?');
    const markMetadata = db.prepare(`
      UPDATE bible_book_metadata
      SET text_status='complete', english_status='available', source_name=?, source_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `);
    for (const [bookCode, chapterCount] of chaptersByBook) {
      updateBook.run(chapterCount, chapterCount, bookCode);
      markMetadata.run(source.name_en, source.url, bookCode);
    }
    db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
    console.log(`[Bible] ${source.slug}: ${rows.length} وحدة نصية`);
  }

  const samaritanId = insertTranslation.run(
    SAMARITAN_SOURCE.slug,
    SAMARITAN_SOURCE.name_ar,
    SAMARITAN_SOURCE.name_en,
    SAMARITAN_SOURCE.abbreviation,
    SAMARITAN_SOURCE.language,
    SAMARITAN_SOURCE.url,
    SAMARITAN_SOURCE.source_type,
    SAMARITAN_SOURCE.notes,
    26
  ).lastInsertRowid || db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(SAMARITAN_SOURCE.slug).id;
  const samaritanRows = parseSamaritanOsis(await fetchText(SAMARITAN_SOURCE.url));
  const samaritanDbRows = samaritanRows.map((verse) => [
    samaritanId, verse.bookCode, verse.chapter, verse.verse, verse.text,
    normalizeArabicText(verse.text), SAMARITAN_SOURCE.url
  ]);
  for (let offset = 0; offset < samaritanDbRows.length; offset += 2000) insertMany(samaritanDbRows.slice(offset, offset + 2000));
  const samaritanCounts = new Map();
  for (const verse of samaritanRows) samaritanCounts.set(verse.bookCode, Math.max(samaritanCounts.get(verse.bookCode) || 0, verse.chapter));
  for (const [bookCode, chapterCount] of samaritanCounts) {
    db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code=?').run(chapterCount, chapterCount, bookCode);
    db.prepare(`
      UPDATE bible_book_metadata
      SET text_status='complete', english_status='available', original_language='السامرية', source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(SAMARITAN_SOURCE.name_en, SAMARITAN_SOURCE.url, SAMARITAN_SOURCE.notes, bookCode);
  }
  db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(samaritanId);
  console.log(`[Bible] ${SAMARITAN_SOURCE.slug}: ${samaritanRows.length} وحدة نصية`);

  const peshittaSlug = 'syr-peshitta';
  const peshittaUrl = 'https://gitlab.com/crosswire-bible-society/peshitta/-/tree/master/usfm';
  const peshittaId = insertTranslation.run(
    peshittaSlug,
    'البيشيطا السريانية',
    'Syriac Peshitta New Testament',
    'PESH-SYR',
    'syr',
    peshittaUrl,
    'usfm',
    'الشاهد السرياني المنشور في ملفات يو إس إف إم لمشروع جمعية كروس واير؛ يحفظ هنا بوصفه تقليداً سريانياً موازياً، ولا يدعي تمثيل كل تاريخ البيشيطا أو كل صيغها المخطوطية.',
    23
  ).lastInsertRowid || db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(peshittaSlug).id;
  const peshittaRows = [];
  for (const [bookCode, filename] of PESHITTA_FILES) {
    const url = `https://gitlab.com/crosswire-bible-society/peshitta/-/raw/master/usfm/${encodeURI(filename)}`;
    const parsed = parseUsfm(await fetchText(url), bookCode);
    peshittaRows.push(...parsed.map((verse) => [
      peshittaId, verse.bookCode, verse.chapter, verse.verse, verse.text,
      normalizeArabicText(verse.text), url
    ]));
    const chapterCount = Math.max(...parsed.map((verse) => verse.chapter), 0);
    if (chapterCount) {
      db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code=?').run(chapterCount, chapterCount, bookCode);
      db.prepare(`
        UPDATE bible_book_metadata
        SET text_status='complete', english_status='available', source_name=?, source_url=?, updated_at=CURRENT_TIMESTAMP
        WHERE book_code=?
      `).run('Syriac Peshitta New Testament', url, bookCode);
    }
  }
  for (let offset = 0; offset < peshittaRows.length; offset += 2000) insertMany(peshittaRows.slice(offset, offset + 2000));
  db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(peshittaId);
  console.log(`[Bible] ${peshittaSlug}: ${peshittaRows.length} وحدة نصية`);

  for (const source of HTML_SOURCES) {
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('en-web')?.id;
    if (!translationId) throw new Error('لم توجد ترجمة en-web قبل استيراد المصادر الإضافية');
    const parsed = parseHtmlVerses(await fetchText(source.url));
    const rows = parsed.map((verse) => [
      translationId, source.bookCode, verse.chapter, verse.verse, verse.text,
      normalizeArabicText(verse.text), source.url
    ]);
    insertMany(rows);
    db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < 1 THEN 1 ELSE chapter_count END WHERE code=?').run(source.bookCode);
    db.prepare(`
      UPDATE bible_book_metadata
      SET text_status='complete', english_status='available', source_name=?, source_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run('World English Bible Classic', source.url, source.bookCode);
    db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(translationId);
    console.log(`[Bible] en-web/${source.bookCode}: ${rows.length} وحدة نصية`);
  }
}

run().catch((error) => {
  console.error('[Bible expansion import]', error.message);
  process.exit(1);
});
