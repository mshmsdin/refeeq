import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const MANUSCRIPTS = [
  { slug: 'heb-qdr-4q383-apocryphon-jeremiah-a-2026', bookCode: 'AJ383', units: 30, groups: 9 },
  { slug: 'heb-qdr-4q384-apocryphon-jeremiah-b-2026', bookCode: 'AJ384', units: 81, groups: 31 },
  { slug: 'heb-qdr-4q385c-apocryphon-jeremiah-2026', bookCode: 'AJ385C', units: 20, groups: 7 }
];

function getSourceState(db, manuscript, definition) {
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
  `).get(manuscript.bookCode, definition.nameAr, definition.language, definition.url,
    definition.sourceType, definition.notes, manuscript.bookCode, manuscript.bookCode, manuscript.slug);
}

function sourceIsReady(state, manuscript) {
  return state && state.language === 'he' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === manuscript.units
    && state.group_count === manuscript.groups && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, manuscript, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, manuscript.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumranJeremiahAbImported() {
  const db = getDb();
  let changed = false;
  for (const manuscript of MANUSCRIPTS) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === manuscript.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${manuscript.slug}`);

    const current = getSourceState(db, manuscript, definition);
    if (sourceIsReady(current, manuscript) && await sourceUnitsMatch(db, current.id, manuscript, definition)) continue;

    await importNoncanonicalSources([manuscript.slug], { initializeDatabase: false });
    const imported = getSourceState(db, manuscript, definition);
    if (!sourceIsReady(imported, manuscript) || !await sourceUnitsMatch(db, imported.id, manuscript, definition)) {
      throw new Error(`تعذر تثبيت الشاهد العبري المرخص ${manuscript.bookCode}`);
    }
    changed = true;
  }
  return changed;
}
