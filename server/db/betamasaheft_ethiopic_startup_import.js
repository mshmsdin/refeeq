import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const BETAMASAHEFT_ETHIOPIC_SOURCES = ADDITIONAL_SOURCES.filter(({ slug }) =>
  slug === 'gez-betamasaheft-enoch-eotc-2026' || slug === 'gez-betamasaheft-jubilees-eotc-2026'
);

function getState(db, source) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code=? AND bbs.label_ar=? AND bbs.language='gez'
          AND bbs.source_url=? AND bbs.source_type='cc-by-sa-4.0'
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    WHERE bt.slug=? GROUP BY bt.id
  `).get(source.bookCode, source.nameAr, source.url, source.bookCode, source.slug);
}

function isReady(state, source) {
  return state && state.language === 'gez' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === source.expectedUnitCount
    && state.chapter_count === source.maxChapter && state.source_record_ready === 1;
}

async function unitsMatch(db, translationId, source) {
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, source.bookCode);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureBetamasaheftEthiopicWorksImported() {
  if (BETAMASAHEFT_ETHIOPIC_SOURCES.length !== 2) {
    throw new Error('تعذر العثور على مصدري أخنوخ واليوبيلات الجعزيين من بيتا مصاحفت');
  }
  const db = getDb();
  const ready = await Promise.all(BETAMASAHEFT_ETHIOPIC_SOURCES.map(async (source) => {
    const state = getState(db, source);
    return isReady(state, source) && await unitsMatch(db, state.id, source);
  }));
  if (ready.every(Boolean)) return false;

  await importNoncanonicalSources(BETAMASAHEFT_ETHIOPIC_SOURCES.map(({ slug }) => slug), { initializeDatabase: false });
  for (const source of BETAMASAHEFT_ETHIOPIC_SOURCES) {
    const state = getState(db, source);
    if (!isReady(state, source) || !await unitsMatch(db, state.id, source)) {
      throw new Error(`لم تطابق وحدات ${source.bookCode} الجعزية ملف الطبعة كاملاً بعد الاستيراد`);
    }
  }
  return true;
}
