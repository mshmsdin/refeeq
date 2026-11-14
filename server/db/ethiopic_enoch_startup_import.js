import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const ENOCH_GEEZ_SOURCE = ADDITIONAL_SOURCES.find(
  ({ slug }) => slug === 'gez-ocp-1en-rylands23-p-2026'
);

const EXPECTED_UNITS = 542;
const EXPECTED_CHAPTERS = 71;

function getSourceState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status, bbm.original_language,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='ENO' AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='ENO'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='ENO'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(ENOCH_GEEZ_SOURCE.nameAr, ENOCH_GEEZ_SOURCE.language, ENOCH_GEEZ_SOURCE.url,
    ENOCH_GEEZ_SOURCE.sourceType, ENOCH_GEEZ_SOURCE.notes, ENOCH_GEEZ_SOURCE.slug);
}

function sourceIsReady(state) {
  return state && state.language === 'gez' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-4.0' && state.unit_count === EXPECTED_UNITS
    && state.chapter_count === EXPECTED_CHAPTERS && state.text_status === 'partial'
    && state.original_language === 'الجعزية' && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId) {
  const expected = parseReviewedUnitText(await readFile(ENOCH_GEEZ_SOURCE.textFile, 'utf8'), ENOCH_GEEZ_SOURCE)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ENO' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureEthiopicEnochImported() {
  if (!ENOCH_GEEZ_SOURCE) throw new Error('تعذر العثور على تعريف شاهد أخنوخ الجعزي');
  const db = getDb();
  const current = getSourceState(db);
  if (sourceIsReady(current) && await sourceUnitsMatch(db, current.id)) return false;

  await importNoncanonicalSources([ENOCH_GEEZ_SOURCE.slug], { initializeDatabase: false });
  db.prepare(`
    INSERT OR IGNORE INTO bible_book_metadata
      (book_code, canonicality_status, textual_tradition, original_language, text_status,
       arabic_status, english_status, future_translation_status, summary_ar, source_name, source_url, source_notes)
    VALUES ('ENO', 'non_canonical', 'ethiopic', 'الجعزية', 'partial', 'planned', 'available', 'planned', ?, ?, ?, ?)
  `).run(
    'يتوفر لأخنوخ الأول شاهد جعزي جزئي من مخطوط ريلاندز ٢٣، ويقتصر على الأصحاحات ١–٧١.',
    ENOCH_GEEZ_SOURCE.nameAr,
    ENOCH_GEEZ_SOURCE.url,
    ENOCH_GEEZ_SOURCE.notes
  );
  const imported = getSourceState(db);
  const unitsMatch = imported ? await sourceUnitsMatch(db, imported.id) : false;
  if (!sourceIsReady(imported) || !unitsMatch) {
    throw new Error('لم يطابق شاهد أخنوخ الجعزي وحداته الـ٥٤٢ بعد استيراده');
  }
  return true;
}
