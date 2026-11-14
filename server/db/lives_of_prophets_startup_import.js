import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const BOOK_CODE = 'LPRO';
const WITNESSES = [
  { slug: 'en-ocp-lives-prophets-2026', language: 'en', units: 141, displayOrder: 40 },
  { slug: 'grc-ocp-lives-prophets-2026', language: 'grc', units: 141, displayOrder: 41 }
];

function getSourceState(db, witness, definition) {
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
    definition.notes, BOOK_CODE, BOOK_CODE, witness.slug);
}

function sourceIsReady(state, witness) {
  return state && state.language === witness.language && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-4.0' && state.unit_count === witness.units
    && state.display_order === witness.displayOrder && state.chapter_count === 23
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

export async function ensureLivesOfProphetsImported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT (SELECT canonical_order FROM bible_books WHERE code='AJC390') AS prior_position,
      (SELECT canonical_order FROM bible_books WHERE code='LPRO') AS book_position,
      (SELECT canonical_order FROM bible_books WHERE code='2BAR') AS next_position
  `).get();
  if (!order || order.prior_position !== 39.6 || order.book_position !== 39.8 || order.next_position !== 40) {
    throw new Error('يجب أن تبقى سِيَر الأنبياء بعد شواهد إرميا القمرانية وقبل باروخ الثاني في ترتيب المجموعة');
  }

  const sourcesToImport = [];
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);
    const current = getSourceState(db, witness, definition);
    if (!sourceIsReady(current, witness) || !await sourceUnitsMatch(db, current.id, definition)) {
      sourcesToImport.push(witness);
    }
  }
  if (!sourcesToImport.length) return false;

  await importNoncanonicalSources(sourcesToImport.map(({ slug }) => slug), { initializeDatabase: false });
  const setDisplayOrder = db.prepare('UPDATE bible_translations SET display_order=? WHERE slug=?');
  for (const witness of WITNESSES) setDisplayOrder.run(witness.displayOrder, witness.slug);

  for (const witness of sourcesToImport) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    const imported = getSourceState(db, witness, definition);
    if (!sourceIsReady(imported, witness) || !await sourceUnitsMatch(db, imported.id, definition)) {
      throw new Error(`تعذر تثبيت نص سِيَر الأنبياء الموثق ${witness.slug}`);
    }
  }
  return true;
}
