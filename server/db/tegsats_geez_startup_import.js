import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const TEGSAT_SOURCE = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'gez-betamasaheft-tegsats-2026');
const SUMMARY = 'تغسات هو القسم الإثيوبي من أمثال ٢٥–٣١. يتاح نص جعزي كامل من طبعة الكتاب المقدس الإثيوبي المطبوع، في ٦ فصول و١٦١ وحدة وفق تقسيم الشاهد؛ كما يتاح تقسيم عربي من فان دايك في ٧ فصول و٢٠٢ عدد. ترقيم النسختين مختلف ومحفوظ كما في كل مصدر.';
const BOOK_SOURCE_NOTES = 'النص الجعزي من سجل بيتا مصاحفت LIT2396Tagsas، رقمنة نص الكتاب المقدس الإثيوبي المطبوع، مرخص برخصة المشاع الإبداعي النسب بالمثل ٤٫٠. له ٦ فصول و١٦١ وحدة. النص العربي المقابل من تقسيم فان دايك لأمثال ٢٥–٣١ وله ٧ فصول و٢٠٢ عدد؛ لا يُدمج الترقيمان.';

function getState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='TAGS' AND bbs.label_ar=? AND bbs.language='gez'
          AND bbs.source_url=? AND bbs.source_type='cc-by-sa-4.0'
      ) AS source_record_ready,
      (SELECT summary_ar FROM bible_book_metadata WHERE book_code='TAGS') AS summary_ar,
      (SELECT source_name FROM bible_book_metadata WHERE book_code='TAGS') AS book_source_name,
      (SELECT source_url FROM bible_book_metadata WHERE book_code='TAGS') AS book_source_url,
      (SELECT source_notes FROM bible_book_metadata WHERE book_code='TAGS') AS book_source_notes,
      (SELECT text_status FROM bible_book_metadata WHERE book_code='TAGS') AS text_status,
      (SELECT arabic_status FROM bible_book_metadata WHERE book_code='TAGS') AS arabic_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='TAGS'
    WHERE bt.slug=? GROUP BY bt.id
  `).get(TEGSAT_SOURCE.nameAr, TEGSAT_SOURCE.url, TEGSAT_SOURCE.slug);
}

function isReady(state) {
  return state && state.language === 'gez' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === 161 && state.chapter_count === 6
    && state.source_record_ready === 1 && state.summary_ar === SUMMARY
    && state.book_source_name === 'بيتا مصاحفت؛ الكتاب المقدس الإثيوبي المطبوع'
    && state.book_source_url === TEGSAT_SOURCE.url && state.book_source_notes === BOOK_SOURCE_NOTES
    && state.text_status === 'complete' && state.arabic_status === 'available';
}

async function unitsMatch(db, translationId) {
  const expected = parseReviewedUnitText(await readFile(TEGSAT_SOURCE.textFile, 'utf8'), TEGSAT_SOURCE)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='TAGS' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureTegsatGeezImported() {
  if (!TEGSAT_SOURCE) throw new Error('تعذر العثور على تعريف مصدر تغسات الجعزي');
  const db = getDb();
  let state = getState(db);
  if (isReady(state) && await unitsMatch(db, state.id)) return false;

  await importNoncanonicalSources([TEGSAT_SOURCE.slug], { initializeDatabase: false });
  db.prepare(`
    UPDATE bible_book_metadata
    SET summary_ar=?, source_name=?, source_url=?, source_notes=?, text_status='complete',
      arabic_status='available', updated_at=CURRENT_TIMESTAMP
    WHERE book_code='TAGS'
  `).run(SUMMARY, 'بيتا مصاحفت؛ الكتاب المقدس الإثيوبي المطبوع', TEGSAT_SOURCE.url, BOOK_SOURCE_NOTES);
  state = getState(db);
  if (!isReady(state) || !await unitsMatch(db, state.id)) {
    throw new Error('لم يطابق نص تغسات الجعزي كل الوحدات الـ١٦١ وتوثيق مصدره بعد الاستيراد');
  }
  return true;
}
