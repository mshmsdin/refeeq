import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESSES = [
  { slug: 'arc-qdr-4q204-enoch-2026', units: 126, groups: 11 },
  { slug: 'arc-qdr-4q205-enoch-2026', units: 31, groups: 5 },
  { slug: 'arc-qdr-4q206-enoch-2026', units: 86, groups: 12 },
  { slug: 'arc-qdr-4q207-enoch-2026', units: 6, groups: 1 },
  { slug: 'arc-qdr-4q208-enoch-2026', units: 124, groups: 38 },
  { slug: 'arc-qdr-4q209-enoch-2026', units: 171, groups: 46 },
  { slug: 'arc-qdr-4q210-enoch-2026', units: 25, groups: 2 },
  { slug: 'arc-qdr-4q211-enoch-2026', units: 16, groups: 3 },
  { slug: 'arc-qdr-4q212-enoch-2026', units: 55, groups: 5 }
];

function getSourceState(db, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS group_count,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code=? AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='ENO'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get('ENO', definition.nameAr, definition.language, definition.url, definition.sourceType,
    definition.notes, definition.slug);
}

function sourceIsReady(state, witness) {
  return state && state.language === 'arc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === witness.units
    && state.group_count === witness.groups && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ENO' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureQumranEnochImported() {
  const db = getDb();
  let changed = false;
  for (const witness of WITNESSES) {
    const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === witness.slug);
    if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${witness.slug}`);

    const current = getSourceState(db, definition);
    if (sourceIsReady(current, witness) && await sourceUnitsMatch(db, current.id, definition)) continue;

    await importNoncanonicalSources([witness.slug], { initializeDatabase: false });
    const imported = getSourceState(db, definition);
    if (!sourceIsReady(imported, witness) || !await sourceUnitsMatch(db, imported.id, definition)) {
      throw new Error(`تعذر تثبيت النص الآرامي المرخص للشاهد ${witness.slug}`);
    }
    changed = true;
  }
  return changed;
}
