import AdmZip from 'adm-zip';
import { pathToFileURL } from 'node:url';
import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

export const SOURCE_URL = 'https://ebible.org/Scriptures/eng-kjv_vpl.zip';
const SOURCE_NAME = 'King James Version with Apocrypha (public domain)';
const NOTES = 'شاهد إنجليزي موازٍ كامل من نسخة الملك جيمس مع الأسفار القانونية الثانية. النص مترجم عن تقليد يوناني/لاتيني، وليس ترجمة عن الجعزية؛ وتوجد فروق بينه وبين مراجعة ابن سيراخ الإثيوبية.';

export function parseVplBookRows(vplText, bookCode = 'SIR') {
  const rows = [];
  const seen = new Set();
  for (const line of String(vplText).split(/\r?\n/)) {
    const match = line.match(new RegExp(`^${bookCode}\\s+(\\d+):(\\d+)\\s+(.+)$`));
    if (!match) continue;
    const chapter = Number(match[1]);
    const verse = Number(match[2]);
    const text = match[3].trim();
    const key = `${chapter}:${verse}`;
    if (!chapter || !verse || !text || seen.has(key)) {
      throw new Error(`سطر غير صالح أو مكرر في المصدر: ${line}`);
    }
    seen.add(key);
    rows.push({ chapter, verse, text });
  }
  rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  const chapters = [...new Set(rows.map((row) => row.chapter))];
  if (chapters.length !== 51 || chapters[0] !== 1 || chapters.at(-1) !== 51) {
    throw new Error(`نص ابن سيراخ غير مكتمل: وُجدت ${chapters.length} فصول بدلاً من 51.`);
  }
  for (let chapter = 1; chapter <= 51; chapter += 1) {
    const verses = rows.filter((row) => row.chapter === chapter).map((row) => row.verse);
    if (!verses.length || verses.some((verse, index) => verse !== index + 1)) {
      throw new Error(`ترقيم أعداد الفصل ${chapter} غير مكتمل أو غير متصل.`);
    }
  }
  return rows;
}

async function downloadSource(fetchImpl = fetch) {
  const response = await fetchImpl(SOURCE_URL, {
    headers: { Accept: 'application/zip,application/octet-stream;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} عند جلب مصدر ابن سيراخ.`);
  const archive = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const file = archive.getEntry('eng-kjv_vpl.txt');
  if (!file) throw new Error('ملف الأعداد غير موجود داخل أرشيف المصدر.');
  return file.getData().toString('utf8');
}

export async function importEthiopianSirach({ fetchImpl } = {}) {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  const rows = parseVplBookRows(await downloadSource(fetchImpl));
  const upsertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order, imported_at, updated_at)
    VALUES ('en-kjv-apocrypha', 'نسخة الملك جيمس الإنجليزية مع الأبوكريفا', 'King James Version with Apocrypha', 'KJVA', 'en', ?, 'vpl', ?, 'bible', 1, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, source_url=excluded.source_url,
      source_type=excluded.source_type, source_notes=excluded.source_notes, site_scope='bible',
      is_active=1, updated_at=CURRENT_TIMESTAMP
  `);
  upsertTranslation.run(SOURCE_URL, NOTES);
  const translation = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('en-kjv-apocrypha');
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, 'SIRE', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text,
      source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  db.transaction((items) => {
    for (const row of items) insertVerse.run(
      translation.id, row.chapter, row.verse, row.text, normalizeArabicText(row.text), SOURCE_URL
    );
    db.prepare("UPDATE bible_books SET chapter_count=51 WHERE code='SIRE'").run();
    db.prepare(`
      UPDATE bible_book_metadata SET text_status='complete', english_status='available',
        source_name=?, source_url=?, source_notes=?, summary_ar=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code='SIRE'
    `).run(SOURCE_NAME, SOURCE_URL, NOTES, NOTES);
    db.prepare(`
      INSERT INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES ('SIRE', 'شاهد إنجليزي موازٍ: نسخة الملك جيمس مع الأبوكريفا', 'English parallel witness: King James Version with Apocrypha', 'الإنجليزية', 'available', 'parallel-text', ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
        availability_status='available', source_type='parallel-text', notes=excluded.notes
    `).run(SOURCE_URL, NOTES);
  })(rows);
  const verify = db.prepare(`
    SELECT COUNT(*) AS verse_count, COUNT(DISTINCT chapter) AS chapter_count,
      MIN(chapter) AS first_chapter, MAX(chapter) AS last_chapter
    FROM bible_verses WHERE translation_id=? AND book_code='SIRE'
  `).get(translation.id);
  if (verify.verse_count !== rows.length || verify.chapter_count !== 51 || verify.first_chapter !== 1 || verify.last_chapter !== 51) {
    throw new Error(`فشل التحقق بعد الإدخال: ${JSON.stringify(verify)}`);
  }
  console.log(`[Bible parallel import] SIRE: ${verify.chapter_count} فصلاً، ${verify.verse_count} عدداً؛ شاهد إنجليزي، وليس نصاً جعزياً.`);
  return verify;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importEthiopianSirach().catch((error) => {
    console.error('[Bible Sirach parallel import]', error.message);
    process.exitCode = 1;
  });
}
