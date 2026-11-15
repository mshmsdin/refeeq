import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESS = {
  slug: 'en-james-acts-john-1924',
  bookCode: 'ACTJOHN',
  units: 96,
  sections: 1
};

function getSourceState(db, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
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
  `).get(WITNESS.bookCode, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, WITNESS.bookCode, WITNESS.bookCode, WITNESS.slug);
}

function sourceIsReady(state) {
  return state && state.language === 'en' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'public-domain-text' && state.unit_count === WITNESS.units
    && state.chapter_count === WITNESS.sections && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, WITNESS.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureActsJohnImported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT (SELECT canonical_order FROM bible_books WHERE code='ACTTHOM') AS prior_position,
      (SELECT canonical_order FROM bible_books WHERE code='ACTJOHN') AS witness_position,
      (SELECT canonical_order FROM bible_books WHERE code='LAOD') AS next_position
  `).get();
  if (!order || order.prior_position !== 41 || order.witness_position !== 41.5 || order.next_position !== 42) {
    throw new Error('يجب أن يبقى سجل أعمال يوحنا بعد أعمال توما وقبل رسالة اللاودكيين');
  }

  const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === WITNESS.slug);
  if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${WITNESS.slug}`);
  const current = getSourceState(db, definition);
  if (sourceIsReady(current) && await sourceUnitsMatch(db, current.id, definition)) return false;

  await importNoncanonicalSources([WITNESS.slug], { initializeDatabase: false });
  const imported = getSourceState(db, definition);
  if (!sourceIsReady(imported) || !await sourceUnitsMatch(db, imported.id, definition)) {
    throw new Error('تعذر تثبيت الأقسام الرقمية الباقية من أعمال يوحنا ومصدرها');
  }
  return true;
}
