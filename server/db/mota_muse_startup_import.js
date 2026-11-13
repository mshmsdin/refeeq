import { getDb } from './schema.js';
import { run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';

const SOURCES = [
  { slug: 'gez-opensiddur-mota-muse-2019', language: 'gez' },
  { slug: 'en-opensiddur-mota-muse-mayer-2019', language: 'en' }
];
const EXPECTED_UNITS = 15;

function getSourceStates(db) {
  return db.prepare(`
    SELECT bt.slug, bt.language, bt.is_active, bt.site_scope,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='MOTA-MUSE'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='MOTA-MUSE'
    WHERE bt.slug IN (?, ?)
    GROUP BY bt.id
  `).all(...SOURCES.map(({ slug }) => slug));
}

function sourcesAreReady(states) {
  return states.length === SOURCES.length && SOURCES.every((expected) => {
    const actual = states.find(({ slug }) => slug === expected.slug);
    return actual && actual.language === expected.language && actual.is_active === 1
      && actual.site_scope === 'both' && actual.unit_count === EXPECTED_UNITS
      && actual.chapter_count === 1 && actual.text_status === 'partial';
  });
}

export async function ensureMotaMuseImported() {
  const db = getDb();
  const current = getSourceStates(db);
  if (sourcesAreReady(current)) return false;

  await importNoncanonicalSources(SOURCES.map(({ slug }) => slug), { initializeDatabase: false });
  const imported = getSourceStates(db);
  if (!sourcesAreReady(imported)) {
    throw new Error('تعذر تثبيت وحدات موتى موسى الخمس عشرة في النصين الجعزي والإنجليزي');
  }
  return true;
}
