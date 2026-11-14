import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'he-qdr-1q19-noah-fragments-2026', language: 'he', units: 42, chapters: 19, displayOrder: 40 },
  { slug: 'he-qdr-1q19bis-noah-fragments-2024', language: 'he', units: 6, chapters: 1, displayOrder: 41 },
  { slug: 'en-project-1q19-noah-fragments-2026', language: 'en', units: 42, chapters: 19, displayOrder: 38 },
  { slug: 'en-project-1q19bis-noah-fragments-2026', language: 'en', units: 6, chapters: 1, displayOrder: 39 }
];

function getSourceState(db, witness, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type, bt.display_order,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='NOAH' AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='NOAH'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='NOAH'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(definition.nameAr, definition.language, definition.url, definition.sourceType, definition.notes, witness.slug);
}

function sourceIsReady(state, witness, definition) {
  return state && state.language === witness.language && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.chapter_count === witness.chapters && state.text_status === 'partial'
    && state.display_order === witness.displayOrder
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === definition.slug);
  if (!source) return false;
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='NOAH' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureNoahQumranImported() {
  const db = getDb();
  const bookOrder = db.prepare(`
    SELECT bb.canonical_order AS position,
      (SELECT canonical_order FROM bible_books WHERE code='ENO2') AS before_position,
      (SELECT canonical_order FROM bible_books WHERE code='GIANTS') AS after_position
    FROM bible_books bb WHERE bb.code='NOAH'
  `).get();
  if (!bookOrder || bookOrder.position !== 8.5 || bookOrder.before_position !== 8 || bookOrder.after_position !== 9) {
    throw new Error('يجب أن تبقى شذرات نوح بعد أخنوخ الثاني وقبل سفر العمالقة في الترتيب القصصي');
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
    db.prepare('UPDATE bible_translations SET display_order=? WHERE slug=?').run(witness.displayOrder, witness.slug);
    const imported = getSourceState(db, witness, definition);
    if (!sourceIsReady(imported, witness, definition) || !await sourceUnitsMatch(db, imported.id, definition)) {
      throw new Error(`تعذر تثبيت الشاهد القمراني الموثق ${witness.slug}`);
    }
  }
  return true;
}
