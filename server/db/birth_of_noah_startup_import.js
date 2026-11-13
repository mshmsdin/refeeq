import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'arc-qdr-4q534-birth-noah-2026', units: 51, chapters: 7 },
  { slug: 'arc-qdr-4q535-birth-noah-2026', units: 12, chapters: 3 },
  { slug: 'arc-qdr-4q536-birth-noah-2026', units: 25, chapters: 4 }
];

function getSourceState(db, witness, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='BNOAH' AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='BNOAH'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='BNOAH'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(definition.nameAr, definition.language, definition.url, definition.sourceType, definition.notes, witness.slug);
}

function sourceIsReady(state, witness, definition) {
  return state && state.language === 'arc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.chapter_count === witness.chapters && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === definition.slug);
  if (!source) return false;
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='BNOAH' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureBirthOfNoahImported() {
  const db = getDb();
  const bookOrder = db.prepare(`
    SELECT bb.canonical_order AS position,
      (SELECT canonical_order FROM bible_books WHERE code='NOAH') AS previous_position,
      (SELECT canonical_order FROM bible_books WHERE code='GIANTS') AS next_position
    FROM bible_books bb WHERE bb.code='BNOAH'
  `).get();
  if (!bookOrder || bookOrder.position !== 8.6 || bookOrder.previous_position !== 8.5 || bookOrder.next_position !== 9) {
    throw new Error('يجب أن تبقى شذرات ولادة نوح بعد شذرات نوح وقبل سفر العمالقة في الترتيب القصصي');
  }

  const sourcesToImport = [];
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);
    const current = getSourceState(db, witness, definition);
    if (!sourceIsReady(current, witness, definition) || !await sourceUnitsMatch(db, current.id, definition)) {
      sourcesToImport.push(witness);
    }
  }
  if (!sourcesToImport.length) return false;

  await importNoncanonicalSources(sourcesToImport.map(({ slug }) => slug), { initializeDatabase: false });
  for (const witness of sourcesToImport) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    const imported = getSourceState(db, witness, definition);
    if (!sourceIsReady(imported, witness, definition) || !await sourceUnitsMatch(db, imported.id, definition)) {
      throw new Error(`تعذر تثبيت الشاهد القمراني الموثق ${witness.slug}`);
    }
  }
  return true;
}
