import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const SOURCES = [
  { slug: 'en-jewishmythology-4q531-2026', language: 'en', units: 2 },
  { slug: 'arc-qdr-book-giants-2026', language: 'arc', units: 602 }
];

function getSourceStates(db) {
  return db.prepare(`
    SELECT bt.slug, bt.language, bt.is_active, bt.site_scope,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='GIANTS'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='GIANTS'
    WHERE bt.slug IN (?, ?)
    GROUP BY bt.id
  `).all(...SOURCES.map(({ slug }) => slug));
}

function sourcesAreReady(states) {
  return states.length === SOURCES.length && SOURCES.every((expected) => {
    const actual = states.find(({ slug }) => slug === expected.slug);
    return actual && actual.language === expected.language && actual.is_active === 1
      && actual.site_scope === 'both' && actual.unit_count === expected.units
      && actual.chapter_count === 1 && actual.text_status === 'partial';
  });
}

async function sourceUnitsMatch(db) {
  for (const { slug } of SOURCES) {
    const source = ADDITIONAL_SOURCES.find((item) => item.slug === slug);
    if (!source) return false;
    const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
      .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(slug)?.id;
    if (!translationId) return false;
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='GIANTS' ORDER BY chapter, verse
    `).all(translationId);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) return false;
  }
  return true;
}

export async function ensureGiantsImported() {
  const db = getDb();
  db.prepare("UPDATE bible_books SET chapter_count=1 WHERE code='GIANTS'").run();
  const current = getSourceStates(db);
  if (sourcesAreReady(current) && await sourceUnitsMatch(db)) return false;

  await importNoncanonicalSources(SOURCES.map(({ slug }) => slug), { initializeDatabase: false });
  const imported = getSourceStates(db);
  if (!sourcesAreReady(imported) || !await sourceUnitsMatch(db)) {
    throw new Error('تعذر تثبيت وحدات الشاهدين المرخصين لسفر العمالقة');
  }
  return true;
}
