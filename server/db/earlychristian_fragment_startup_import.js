import { getDb } from './schema.js';
import { run as runNoncanonicalImporter } from '../importers/import_noncanonical_english.js';

const MIGRATION_KEY = 'earlychristian-page-container-v1';
const SOURCE_SLUGS = [
  'en-mr-james-gospel-peter',
  'en-mr-james-acts-paul',
  'en-mr-james-acts-peter',
  'en-mr-james-apocalypse-peter',
  'en-mr-james-gospel-nicodemus',
];

export async function ensureEarlyChristianFragmentPagesImported() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS bible_import_migrations (
      migration_key TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  if (db.prepare('SELECT 1 FROM bible_import_migrations WHERE migration_key=?').get(MIGRATION_KEY)) return false;

  await runNoncanonicalImporter(SOURCE_SLUGS, { initializeDatabase: false });

  const placeholders = SOURCE_SLUGS.map(() => '?').join(',');
  const contaminated = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug IN (${placeholders})
      AND (bv.text LIKE '%csshover.txt%' OR bv.text LIKE '%zflag_click%' OR bv.text LIKE '%googlesyndication%')
  `).get(...SOURCE_SLUGS).count;
  if (contaminated) throw new Error(`بقيت ${contaminated} وحدات تحوي شيفرات صفحة خارج متن المقال`);

  db.prepare('INSERT INTO bible_import_migrations (migration_key) VALUES (?)').run(MIGRATION_KEY);
  return true;
}
