import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCES = [
  'heb-qdr-11q19-temple-scroll-2025',
  'en-project-11q19-temple-scroll'
].map((slug) => {
  const source = ADDITIONAL_SOURCES.find((definition) => definition.slug === slug);
  if (!source) throw new Error(`مصدر لفافة الهيكل غير مسجل في المستورد: ${slug}`);
  return source;
});

async function readExpectedUnits(source) {
  return parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
}

function getState(db, source) {
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
  `).get(source.bookCode, source.bookCode, source.bookCode, source.slug);
}

function stateIsReady(state, source, expectedUnits) {
  return Boolean(state) && state.language === source.language && state.source_type === source.sourceType
    && state.site_scope === 'both' && state.is_active === 1
    && state.unit_count === expectedUnits.length && state.chapter_count === 1
    && state.book_chapter_count === 1 && state.text_status === 'partial';
}

function unitsMatch(db, source, translationId, expectedUnits) {
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, source.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expectedUnits.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
}

export async function ensureTempleScrollImported() {
  const db = getDb();
  const expected = await Promise.all(SOURCES.map(async (source) => ({
    source,
    units: await readExpectedUnits(source)
  })));
  const currentReady = expected.every(({ source, units }) => {
    const state = getState(db, source);
    return stateIsReady(state, source, units) && unitsMatch(db, source, state.id, units);
  });
  if (currentReady) return false;

  await importNoncanonicalSources(SOURCES.map(({ slug }) => slug), { initializeDatabase: false });

  for (const { source, units } of expected) {
    const imported = getState(db, source);
    if (!stateIsReady(imported, source, units) || !unitsMatch(db, source, imported.id, units)) {
      throw new Error(`تعذر تثبيت وحدات مصدر لفافة الهيكل ومراجعها كما روجعت: ${source.slug}`);
    }
  }
  return true;
}
