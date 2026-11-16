import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const BOOK_CODE = 'Q391';
const SOURCES = [
  { slug: 'heb-qdr-4q391-words-ezekiel-2026', language: 'he', sourceType: 'cc-by-sa-4.0' },
  { slug: 'en-project-4q391-words-ezekiel', language: 'en', sourceType: 'project-translation' }
].map((source) => ({ ...source, units: 200, groups: 78 }));

function getState(db, definition, source) {
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
  `).get(BOOK_CODE, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, BOOK_CODE, BOOK_CODE, source.slug);
}

function sourceIsReady(state, source) {
  return state && state.language === source.language && state.is_active === 1
    && state.site_scope === 'both' && state.source_type === source.sourceType
    && state.unit_count === source.units && state.group_count === source.groups
    && state.text_status === 'partial' && state.source_record_ready === 1;
}

async function unitsMatch(db, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, BOOK_CODE);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumran4Q391TranslationImported() {
  const db = getDb();
  const definitions = SOURCES.map((source) => {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === source.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${source.slug}`);
    return { source, definition };
  });
  const ready = await Promise.all(definitions.map(async ({ source, definition }) => {
    const state = getState(db, definition, source);
    return sourceIsReady(state, source) && await unitsMatch(db, state.id, definition);
  }));
  if (ready.every(Boolean)) return false;

  await importNoncanonicalSources(SOURCES.map(({ slug }) => slug), { initializeDatabase: false });
  for (const { source, definition } of definitions) {
    const imported = getState(db, definition, source);
    if (!sourceIsReady(imported, source) || !await unitsMatch(db, imported.id, definition)) {
      throw new Error(`تعذر تثبيت وحدات ${source.language === 'he' ? 'الشاهد العبري' : 'المسودة الإنجليزية'} لشاهد 4Q391`);
    }
  }
  return true;
}
