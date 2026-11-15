import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'arc-qdr-4q539-qumran-digital-2025', bookCode: 'Q539', language: 'arc', units: 19, groups: 4 },
  { slug: 'en-project-4q539-fragments-2026', bookCode: 'Q539', language: 'en', units: 7, groups: 1 }
];

function getSourceState(db, definition, witness) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS group_count,
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
  `).get(witness.bookCode, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, witness.bookCode, witness.bookCode, witness.slug);
}

function sourceIsReady(state, witness) {
  return state && state.language === witness.language && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.group_count === witness.groups && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition, witness) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, witness.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumran4Q539Imported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT (SELECT canonical_order FROM bible_books WHERE code='JOSEPH') AS prior_position,
      (SELECT canonical_order FROM bible_books WHERE code='Q539') AS witness_position,
      (SELECT canonical_order FROM bible_books WHERE code='TJOB') AS next_position
  `).get();
  if (!order || order.prior_position !== 21 || order.witness_position !== 21.5 || order.next_position !== 22) {
    throw new Error('يجب أن يبقى شاهد 4Q539 قرب شواهد يوسف وقبل وصية أيوب، مع استقلال تسميته غير المحسومة');
  }

  const imports = [];
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);
    const current = getSourceState(db, definition, witness);
    if (!sourceIsReady(current, witness) || !await sourceUnitsMatch(db, current.id, definition, witness)) {
      imports.push({ witness, definition });
    }
  }
  if (!imports.length) return false;

  await importNoncanonicalSources(imports.map(({ witness }) => witness.slug), { initializeDatabase: false });
  for (const { witness, definition } of imports) {
    const imported = getSourceState(db, definition, witness);
    if (!sourceIsReady(imported, witness) || !await sourceUnitsMatch(db, imported.id, definition, witness)) {
      throw new Error(`تعذر تثبيت المصدر ${witness.slug}`);
    }
  }
  return true;
}
