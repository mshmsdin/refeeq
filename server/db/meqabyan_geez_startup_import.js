import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const MEQABYAN_GEEZ_SOURCES = ADDITIONAL_SOURCES.filter(({ slug }) => slug.startsWith('gez-betamasaheft-meqabyan-'));
const SOURCE_NAME = 'بيتا مصاحفت؛ الكتاب المقدس الإثيوبي المطبوع';

function getState(db, source) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code=? AND bbs.label_ar=? AND bbs.language='gez'
          AND bbs.source_url=? AND bbs.source_type='cc-by-sa-4.0'
      ) AS source_record_ready,
      (SELECT summary_ar FROM bible_book_metadata WHERE book_code=?) AS summary_ar,
      (SELECT source_name FROM bible_book_metadata WHERE book_code=?) AS book_source_name,
      (SELECT source_url FROM bible_book_metadata WHERE book_code=?) AS book_source_url,
      (SELECT source_notes FROM bible_book_metadata WHERE book_code=?) AS book_source_notes,
      (SELECT text_status FROM bible_book_metadata WHERE book_code=?) AS text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    WHERE bt.slug=? GROUP BY bt.id
  `).get(
    source.bookCode, source.nameAr, source.url, source.bookCode, source.bookCode,
    source.bookCode, source.bookCode, source.bookCode, source.bookCode, source.slug
  );
}

function summaryFor(source) {
  const chapterLabel = source.maxChapter === 10 ? 'فصول' : 'فصلاً';
  return `النص الجعزي من بيتا مصاحفت كامل بحسب هذا التفريغ: ${source.maxChapter} ${chapterLabel} و${source.expectedUnitCount} وحدة. تحفظ أرقام أسطر المصدر الأصلية في بيانات الشاهد، ويستخدم العرض ترقيمًا تسلسليًا داخل الفصل بسبب اضطراب بعض أرقام المصدر. شاهد إثيوبي مستقل؛ لا يساوي تلقائياً المكابيين اليونانية.`;
}

function isReady(state, source) {
  return state && state.language === 'gez' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === source.expectedUnitCount
    && state.chapter_count === source.maxChapter && state.source_record_ready === 1
    && state.summary_ar === summaryFor(source) && state.book_source_name === SOURCE_NAME
    && state.book_source_url === source.url && state.book_source_notes === source.notes
    && state.text_status === 'complete';
}

async function unitsMatch(db, translationId, source) {
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, source.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureMeqabyanGeezImported() {
  if (MEQABYAN_GEEZ_SOURCES.length !== 3) throw new Error('تعذر العثور على مصادر المكابيين الإثيوبي الثلاثة');
  const db = getDb();
  const readiness = await Promise.all(MEQABYAN_GEEZ_SOURCES.map(async (source) => {
    const state = getState(db, source);
    return isReady(state, source) && await unitsMatch(db, state.id, source);
  }));
  if (readiness.every(Boolean)) return false;

  await importNoncanonicalSources(MEQABYAN_GEEZ_SOURCES.map(({ slug }) => slug), { initializeDatabase: false });
  const updateMetadata = db.prepare(`
    UPDATE bible_book_metadata
    SET summary_ar=?, source_name=?, source_url=?, source_notes=?, text_status='complete',
      updated_at=CURRENT_TIMESTAMP
    WHERE book_code=?
  `);
  for (const source of MEQABYAN_GEEZ_SOURCES) {
    updateMetadata.run(summaryFor(source), SOURCE_NAME, source.url, source.notes, source.bookCode);
    const state = getState(db, source);
    if (!isReady(state, source) || !await unitsMatch(db, state.id, source)) {
      throw new Error(`لم يطابق نص ${source.bookCode} كل وحداته وتوثيق مصدره بعد الاستيراد`);
    }
  }
  return true;
}
