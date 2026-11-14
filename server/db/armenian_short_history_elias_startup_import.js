import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const BOOK_CODE = 'ARMELI';
const SLUG = 'en-armenian-short-history-elias-1901';
const DISPLAY_ORDER = 40;
const UNIT_COUNT = 16;

function getSourceState(db, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type, bt.display_order,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status,
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

function sourceIsReady(state) {
  return state && state.language === 'en' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'public-domain-text' && state.unit_count === UNIT_COUNT
    && state.chapter_count === 1 && state.display_order === DISPLAY_ORDER
    && state.text_status === 'complete' && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, BOOK_CODE);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureArmenianShortHistoryEliasImported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT (SELECT canonical_order FROM bible_books WHERE code='SEELI') AS previous_position,
      (SELECT canonical_order FROM bible_books WHERE code='ARMELI') AS book_position,
      (SELECT canonical_order FROM bible_books WHERE code='VISEL') AS next_position
  `).get();
  if (!order || order.previous_position !== 30 || order.book_position !== 30.5 || order.next_position !== 31) {
    throw new Error('يجب أن يظهر التاريخ الأرمني لإيليا بعد كتاب إيليا العبري وقبل رؤيا إيليا اللاتينية');
  }

  const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === SLUG);
  if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${SLUG}`);
  const current = getSourceState(db, definition);
  if (sourceIsReady(current) && await sourceUnitsMatch(db, current.id, definition)) return false;

  await importNoncanonicalSources([SLUG], { initializeDatabase: false });
  db.prepare('UPDATE bible_translations SET display_order=? WHERE slug=?').run(DISPLAY_ORDER, SLUG);
  const imported = getSourceState(db, definition);
  if (!sourceIsReady(imported) || !await sourceUnitsMatch(db, imported.id, definition)) {
    throw new Error('تعذر تثبيت وحدات ترجمة التاريخ الأرمني القصير لإيليا ومصادرها كما روجعت');
  }
  return true;
}
