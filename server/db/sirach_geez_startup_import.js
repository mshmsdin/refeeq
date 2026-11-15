import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const SIRACH_GEEZ_SOURCE = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'gez-betamasaheft-sirach-2026');
const SOURCE_NAME = 'بيتا مصاحفت؛ الكتاب المقدس الإثيوبي المطبوع';
const SUMMARY = 'يتاح سفر يشوع بن سيراخ بشاهد جعزي كامل من بيتا مصاحفت: ٥١ فصلاً و١٣٦٦ وحدة بحسب ترتيب سطور المصدر. أرقام العرض متسلسلة، وأرقام المصدر الأصلية محفوظة في ملف الاستيراد لأن بعض الفصول تحوي فجوات وتكراراً في الترقيم. تبقى ترجمة الملك جيمس الإنجليزية شاهداً مستقلاً متاحاً.';

function getState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='SIRE' AND bbs.label_ar=? AND bbs.language='gez'
          AND bbs.source_url=? AND bbs.source_type='cc-by-sa-4.0'
      ) AS source_record_ready,
      (SELECT summary_ar FROM bible_book_metadata WHERE book_code='SIRE') AS summary_ar,
      (SELECT source_name FROM bible_book_metadata WHERE book_code='SIRE') AS book_source_name,
      (SELECT source_url FROM bible_book_metadata WHERE book_code='SIRE') AS book_source_url,
      (SELECT source_notes FROM bible_book_metadata WHERE book_code='SIRE') AS book_source_notes,
      (SELECT original_language FROM bible_book_metadata WHERE book_code='SIRE') AS original_language,
      (SELECT text_status FROM bible_book_metadata WHERE book_code='SIRE') AS text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='SIRE'
    WHERE bt.slug=? GROUP BY bt.id
  `).get(SIRACH_GEEZ_SOURCE.nameAr, SIRACH_GEEZ_SOURCE.url, SIRACH_GEEZ_SOURCE.slug);
}

async function unitsMatch(db, translationId) {
  const expected = parseReviewedUnitText(await readFile(SIRACH_GEEZ_SOURCE.textFile, 'utf8'), SIRACH_GEEZ_SOURCE)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='SIRE' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function isReady(state) {
  return state && state.language === 'gez' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === 1366 && state.chapter_count === 51
    && state.source_record_ready === 1 && state.summary_ar === SUMMARY
    && state.book_source_name === SOURCE_NAME && state.book_source_url === SIRACH_GEEZ_SOURCE.url
    && state.book_source_notes === SIRACH_GEEZ_SOURCE.notes && state.original_language === 'الجعزية'
    && state.text_status === 'complete';
}

export async function ensureSirachGeezImported() {
  if (!SIRACH_GEEZ_SOURCE) throw new Error('تعذر العثور على تعريف مصدر ابن سيراخ الجعزي');
  const db = getDb();
  let state = getState(db);
  if (isReady(state) && await unitsMatch(db, state.id)) return false;

  await importNoncanonicalSources([SIRACH_GEEZ_SOURCE.slug], { initializeDatabase: false });
  db.prepare(`
    UPDATE bible_book_metadata
    SET summary_ar=?, source_name=?, source_url=?, source_notes=?, original_language='الجعزية', text_status='complete',
      updated_at=CURRENT_TIMESTAMP
    WHERE book_code='SIRE'
  `).run(SUMMARY, SOURCE_NAME, SIRACH_GEEZ_SOURCE.url, SIRACH_GEEZ_SOURCE.notes);
  state = getState(db);
  if (!isReady(state) || !await unitsMatch(db, state.id)) {
    throw new Error('لم يطابق نص ابن سيراخ الجعزي وحداته الـ١٣٦٦ وتوثيق مصدره بعد الاستيراد');
  }
  return true;
}
