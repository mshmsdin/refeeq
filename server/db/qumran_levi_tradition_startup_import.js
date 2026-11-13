import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCES = [
  { slug: 'arc-qdr-apocryphon-levi-a-2026', bookCode: 'APLEV540', units: 9, chapters: 3 },
  { slug: 'arc-qdr-apocryphon-levi-b-2026', bookCode: 'APLEV541', units: 118, chapters: 31 },
  { slug: 'arc-qdr-testament-qahat-2026', bookCode: 'QAHAT', units: 39, chapters: 5 }
];

function getSourceState(db, source, sourceDefinition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status, bbm.source_name, bbm.source_url, bbm.source_notes,
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
  `).get(
    source.bookCode, sourceDefinition.nameAr, sourceDefinition.language, sourceDefinition.url,
    sourceDefinition.sourceType, sourceDefinition.notes,
    source.bookCode, source.bookCode, source.slug
  );
}

function sourceIsReady(state, source, sourceDefinition) {
  return state && state.language === 'arc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === source.units
    && state.chapter_count === source.chapters && state.text_status === 'partial'
    && state.source_name === sourceDefinition.nameEn && state.source_url === sourceDefinition.url
    && state.source_notes === sourceDefinition.notes && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, sourceDefinition) {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === sourceDefinition.slug);
  if (!source) return false;
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, sourceDefinition.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumranLeviTraditionImported() {
  const db = getDb();
  const sourcesToImport = [];
  for (const source of SOURCES) {
    const sourceDefinition = ADDITIONAL_SOURCES.find(({ slug }) => slug === source.slug);
    if (!sourceDefinition) throw new Error(`تعذر العثور على تعريف المصدر ${source.slug}`);
    const current = getSourceState(db, source, sourceDefinition);
    if (!sourceIsReady(current, source, sourceDefinition) || !await sourceUnitsMatch(db, current.id, source)) {
      sourcesToImport.push(source);
    }
  }
  if (!sourcesToImport.length) return false;

  await importNoncanonicalSources(sourcesToImport.map(({ slug }) => slug), { initializeDatabase: false });
  for (const source of sourcesToImport) {
    const sourceDefinition = ADDITIONAL_SOURCES.find(({ slug }) => slug === source.slug);
    const imported = getSourceState(db, source, sourceDefinition);
    if (!sourceIsReady(imported, source, sourceDefinition) || !await sourceUnitsMatch(db, imported.id, source)) {
      throw new Error(`تعذر تثبيت الشواهد القمرانية ${source.bookCode} الموثقة`);
    }
  }
  return true;
}
