import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'he-qdr-4q225-pseudo-jubilees-a-2026', bookCode: 'PSJUBA', units: 49, chapters: 5 },
  { slug: 'he-qdr-4q226-pseudo-jubilees-b-2026', bookCode: 'PSJUBB', units: 64, chapters: 14 }
];

function getSourceState(db, witness, definition) {
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
  `).get(witness.bookCode, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, witness.bookCode, witness.bookCode, witness.slug);
}

function sourceIsReady(state, witness) {
  return state && state.language === 'he' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.chapter_count === witness.chapters && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, witness, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, witness.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensurePseudoJubileesImported() {
  const db = getDb();
  const order = db.prepare(`
    SELECT
      (SELECT canonical_order FROM bible_books WHERE code='ABR') AS previous,
      (SELECT canonical_order FROM bible_books WHERE code='PSJUBA') AS first_witness,
      (SELECT canonical_order FROM bible_books WHERE code='PSJUBB') AS second_witness,
      (SELECT canonical_order FROM bible_books WHERE code='AABR') AS next
  `).get();
  if (!order || order.previous !== 12 || order.first_witness !== 12.5
    || order.second_witness !== 12.6 || order.next !== 13) {
    throw new Error('يجب أن يبقى شاهدا 4Q225 و4Q226 بعد روايات إبراهيم وقبل وصيته في الترتيب القصصي');
  }

  const sourcesToImport = [];
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);
    const current = getSourceState(db, witness, definition);
    if (!sourceIsReady(current, witness) || !await sourceUnitsMatch(db, witness, current.id, definition)) {
      sourcesToImport.push(witness);
    }
  }
  if (!sourcesToImport.length) return false;

  await importNoncanonicalSources(sourcesToImport.map(({ slug }) => slug), { initializeDatabase: false });
  for (const witness of sourcesToImport) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    const imported = getSourceState(db, witness, definition);
    if (!sourceIsReady(imported, witness)
      || !await sourceUnitsMatch(db, witness, imported.id, definition)) {
      throw new Error(`تعذر تثبيت الشاهد القمراني الموثق ${witness.slug}`);
    }
  }
  return true;
}
