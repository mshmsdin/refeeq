import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCE = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'heb-qdr-11q19-temple-scroll-2025');
if (!SOURCE) throw new Error('مصدر لفافة الهيكل غير مسجل في المستورد');

async function readExpectedUnits() {
  return parseReviewedUnitText(await readFile(SOURCE.textFile, 'utf8'), SOURCE);
}

function getState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bb.chapter_count AS book_chapter_count, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    LEFT JOIN bible_books bb ON bb.code=?
    LEFT JOIN bible_book_metadata bm ON bm.book_code=?
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(SOURCE.bookCode, SOURCE.bookCode, SOURCE.bookCode, SOURCE.slug);
}

function stateIsReady(state, expectedUnits) {
  return Boolean(state) && state.language === SOURCE.language && state.source_type === SOURCE.sourceType
    && state.site_scope === 'both' && state.is_active === 1
    && state.unit_count === expectedUnits.length && state.chapter_count === 1
    && state.book_chapter_count === 1 && state.text_status === 'partial';
}

function unitsMatch(db, translationId, expectedUnits) {
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, SOURCE.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expectedUnits.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
}

export async function ensureTempleScrollImported() {
  const db = getDb();
  const expectedUnits = await readExpectedUnits();
  const current = getState(db);
  if (stateIsReady(current, expectedUnits) && unitsMatch(db, current.id, expectedUnits)) return false;

  await importNoncanonicalSources([SOURCE.slug], { initializeDatabase: false });

  const imported = getState(db);
  if (!stateIsReady(imported, expectedUnits) || !unitsMatch(db, imported.id, expectedUnits)) {
    throw new Error('تعذر تثبيت أسطر لفافة الهيكل الـ١٠٧١ ومصادرها كما روجعت');
  }
  return true;
}
