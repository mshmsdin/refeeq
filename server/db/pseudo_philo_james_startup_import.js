import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedChapterText } from '../importers/reviewed_text_source.js';

const BOOK_CODE = 'PSLAB';
const SLUG = 'en-james-biblical-antiquities';
const SUMMARY_AR = 'ترجمة جيمس الإنجليزية عن اللاتينية (١٩١٧): الفصول المرقمة ١–٦٥ متاحة، ومنها ٤٣ و٤٧؛ وتبقى حالة النص جزئية بسبب فجوات موثقة وخاتمة مفقودة.';

function getSourceState(db, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status, bbm.summary_ar, bbm.source_notes,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code=? AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code=?
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(BOOK_CODE, definition.nameAr, definition.language, definition.url, definition.sourceType,
    definition.notes, BOOK_CODE, BOOK_CODE, SLUG);
}

function sourceIsReady(state, definition) {
  return state && state.language === 'en' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'public-domain-text' && state.unit_count === 65
    && state.chapter_count === 65 && state.text_status === 'partial'
    && state.summary_ar === SUMMARY_AR
    && state.source_notes === definition.notes && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const expected = parseReviewedChapterText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, BOOK_CODE);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensurePseudoPhiloJamesImported() {
  const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === SLUG);
  if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${SLUG}`);
  const db = getDb();
  const current = getSourceState(db, definition);
  if (sourceIsReady(current, definition) && await sourceUnitsMatch(db, current.id, definition)) return false;

  await importNoncanonicalSources([SLUG], { initializeDatabase: false });
  db.prepare('UPDATE bible_book_metadata SET summary_ar=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?')
    .run(SUMMARY_AR, BOOK_CODE);
  const imported = getSourceState(db, definition);
  if (!sourceIsReady(imported, definition) || !await sourceUnitsMatch(db, imported.id, definition)) {
    throw new Error('تعذر تثبيت فصول الآثار الكتابية لفيلو ومطابقتها مع المصدر المراجع');
  }
  return true;
}
