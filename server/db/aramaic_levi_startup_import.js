import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCE = { slug: 'arc-qdr-aramaic-levi-2026', units: 281 };

function getSourceState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='ARL'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='ARL'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(SOURCE.slug);
}

function sourceIsReady(state) {
  return state && state.language === 'arc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === SOURCE.units
    && state.chapter_count === 1 && state.text_status === 'partial';
}

async function sourceUnitsMatch(db, translationId) {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === SOURCE.slug);
  if (!source) return false;
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ARL' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureAramaicLeviQumranImported() {
  const db = getDb();
  const current = getSourceState(db);
  if (sourceIsReady(current) && await sourceUnitsMatch(db, current.id)) return false;

  await importNoncanonicalSources([SOURCE.slug], { initializeDatabase: false });
  const imported = getSourceState(db);
  if (!sourceIsReady(imported) || !await sourceUnitsMatch(db, imported.id)) {
    throw new Error('تعذر تثبيت الأسطر القمرانية الموثقة لوثيقة لاوي الآرامية');
  }
  return true;
}
