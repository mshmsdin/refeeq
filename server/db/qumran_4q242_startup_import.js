import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const BOOK_CODE = 'Q242';
const WITNESSES = [
  { slug: 'arc-qdr-4q242-prayer-nabonidus-2026', language: 'arc', sourceType: 'cc-by-sa-4.0', units: 14, groups: 2 },
  { slug: 'en-project-prayer-nabonidus-4q242', language: 'en', sourceType: 'project-translation', units: 14, groups: 2 }
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
  `).get(BOOK_CODE, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, BOOK_CODE, BOOK_CODE, witness.slug);
}

function sourceIsReady(state, witness) {
  return state && state.language === witness.language && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === witness.sourceType && state.unit_count === witness.units
    && state.group_count === witness.groups && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition, witness) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, BOOK_CODE);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumran4Q242Imported() {
  const db = getDb();
  const sources = WITNESSES.map((witness) => {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);
    return { witness, definition };
  });

  const allReady = await Promise.all(sources.map(async ({ witness, definition }) => {
    const state = getSourceState(db, definition, witness);
    return sourceIsReady(state, witness) && await sourceUnitsMatch(db, state.id, definition, witness);
  }));
  if (allReady.every(Boolean)) return false;

  await importNoncanonicalSources(WITNESSES.map(({ slug }) => slug), { initializeDatabase: false });
  for (const { witness, definition } of sources) {
    const imported = getSourceState(db, definition, witness);
    if (!sourceIsReady(imported, witness)
      || !await sourceUnitsMatch(db, imported.id, definition, witness)) {
      throw new Error(`تعذر تثبيت وحدات ${witness.language === 'arc' ? 'الشاهد الآرامي' : 'الترجمة الإنجليزية'} للشاهد القمراني 4Q242`);
    }
  }
  return true;
}
