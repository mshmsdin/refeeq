import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCE = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-narrative-moses-joshua-vassiliev-1893');
if (!SOURCE) throw new Error('ترجمة رواية موسى ويشوع الإنجليزية غير مسجلة');

async function expectedUnits() {
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

function unitsMatch(db, translationId, units) {
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, SOURCE.bookCode);
  return JSON.stringify(actual) === JSON.stringify(units.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
}

function stateIsReady(state, units) {
  return Boolean(state) && state.language === SOURCE.language && state.source_type === SOURCE.sourceType
    && state.site_scope === 'both' && state.is_active === 1
    && state.unit_count === units.length && state.chapter_count === 1
    && state.book_chapter_count === 1 && state.text_status === 'partial';
}

export async function ensureNarrativeMosesJoshuaTranslation() {
  const db = getDb();
  const units = await expectedUnits();
  const current = getState(db);
  if (stateIsReady(current, units) && unitsMatch(db, current.id, units)) return false;

  await importNoncanonicalSources([SOURCE.slug], { initializeDatabase: false });

  const imported = getState(db);
  if (!stateIsReady(imported, units) || !unitsMatch(db, imported.id, units)) {
    throw new Error('تعذر تثبيت وحدات ترجمة رواية موسى ويشوع الثماني ومصادر صفحاتها كما روجعت');
  }
  return true;
}
