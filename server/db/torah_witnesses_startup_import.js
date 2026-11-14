import { getDb } from './schema.js';
import { run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { TORAH_WITNESS_SOURCES } from '../importers/torah_witness_sources.js';

const SLUGS = [...new Set(TORAH_WITNESS_SOURCES.map(({ slug }) => slug))];

function witnessIsReady(db, source) {
  const row = db.prepare(`
    SELECT bt.is_active, bt.language, COUNT(bv.id) AS units
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(source.bookCode, source.slug);
  return Boolean(row) && row.is_active === 1 && row.language === source.language && row.units === source.expectedUnitCount;
}

// يستورد شواهد التوراة غير الماسورية (ترجوم أونكلوس، المنسوب ليوناثان، تفسير سعديا) إن نقص أحدها أو تغيّر عدد وحداته.
export async function ensureTorahWitnessesImported() {
  const db = getDb();
  const missing = TORAH_WITNESS_SOURCES.filter((source) => !witnessIsReady(db, source));
  if (!missing.length) return false;
  await importNoncanonicalSources([...new Set(missing.map(({ slug }) => slug))], { initializeDatabase: false });
  const stillMissing = TORAH_WITNESS_SOURCES.filter((source) => !witnessIsReady(db, source));
  if (stillMissing.length) {
    throw new Error(`تعذر تثبيت شواهد التوراة: ${stillMissing.map(({ bookCode, slug }) => `${slug}/${bookCode}`).join(', ')}`);
  }
  return true;
}

export { SLUGS as TORAH_WITNESS_SLUGS };
