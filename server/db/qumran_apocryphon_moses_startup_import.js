import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { bookCode: 'APM1Q29', slug: 'heb-qdr-1q29-apocryphon-moses-2026', units: 30, groups: 8, order: 23.1 },
  { bookCode: 'APM4Q375', slug: 'heb-qdr-4q375-apocryphon-moses-2026', units: 16, groups: 2, order: 23.2 },
  { bookCode: 'APM4Q376', slug: 'heb-qdr-4q376-apocryphon-moses-2026', units: 12, groups: 4, order: 23.3 },
  { bookCode: 'APM4Q408', slug: 'heb-qdr-4q408-apocryphon-moses-2026', units: 57, groups: 17, order: 23.4 }
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
  return state && state.language === 'hbo' && state.is_active === 1 && state.site_scope === 'both'
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

export async function ensureApocryphonMosesImported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT (SELECT canonical_order FROM bible_books WHERE code='APM1Q29') AS first_witness,
      (SELECT canonical_order FROM bible_books WHERE code='APM4Q375') AS second_witness,
      (SELECT canonical_order FROM bible_books WHERE code='APM4Q376') AS third_witness,
      (SELECT canonical_order FROM bible_books WHERE code='APM4Q408') AS fourth_witness,
      (SELECT canonical_order FROM bible_books WHERE code='MOS') AS testament_of_moses
  `).get();
  if (!order || order.first_witness !== 23.1 || order.second_witness !== 23.2
    || order.third_witness !== 23.3 || order.fourth_witness !== 23.4 || order.testament_of_moses !== 24) {
    throw new Error('يجب أن تبقى شواهد أبوكريفون موسى قبل وصية موسى بحسب الترتيب القصصي');
  }

  let changed = false;
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);

    const current = getSourceState(db, definition, witness);
    if (sourceIsReady(current, witness) && await sourceUnitsMatch(db, current.id, definition, witness)) continue;

    await importNoncanonicalSources([witness.slug], { initializeDatabase: false });
    const imported = getSourceState(db, definition, witness);
    if (!sourceIsReady(imported, witness) || !await sourceUnitsMatch(db, imported.id, definition, witness)) {
      throw new Error(`تعذر تثبيت تفريغ الشاهد العبري المرخص ${witness.slug}`);
    }
    changed = true;
  }
  return changed;
}
