import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'heb-qdr-4q385-words-ezekiel-2026', bookCode: 'Q385', units: 44, groups: 6 },
  { slug: 'heb-qdr-4q385b-words-ezekiel-2026', bookCode: 'Q385B', units: 7, groups: 1 },
  { slug: 'heb-qdr-4q386-words-ezekiel-2026', bookCode: 'Q386', units: 35, groups: 5 },
  { slug: 'heb-qdr-4q388-words-ezekiel-2026', bookCode: 'Q388', units: 38, groups: 8 },
  { slug: 'heb-qdr-4q391-words-ezekiel-2026', bookCode: 'Q391', units: 200, groups: 78 }
];

function getSourceState(db, witness, definition) {
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
  return state && state.language === 'he' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.group_count === witness.groups && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, witness, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, witness.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumranWordsEzekielImported() {
  const db = getDb();
  let changed = false;
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);

    const current = getSourceState(db, witness, definition);
    if (sourceIsReady(current, witness) && await sourceUnitsMatch(db, current.id, witness, definition)) continue;

    await importNoncanonicalSources([witness.slug], { initializeDatabase: false });
    const imported = getSourceState(db, witness, definition);
    if (!sourceIsReady(imported, witness) || !await sourceUnitsMatch(db, imported.id, witness, definition)) {
      throw new Error(`تعذر تثبيت الشاهد العبري المرخص ${witness.bookCode}`);
    }
    changed = true;
  }
  return changed;
}
