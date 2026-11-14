import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `ancient-versions-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureAncientVersionsImported } = await import('./ancient_versions_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports Brenton Septuagint and Clementine Vulgate Old Testament witnesses', () => {
  assert.deepEqual(ensureAncientVersionsImported(), ['en-brenton-lxx-ot', 'la-clementine-vulgate-ot']);
  const db = getDb();
  const totals = db.prepare(`
    SELECT bt.slug, COUNT(*) AS units, COUNT(DISTINCT bv.book_code) AS books FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug IN ('en-brenton-lxx-ot','la-clementine-vulgate-ot') GROUP BY bt.slug ORDER BY bt.slug
  `).all();
  assert.deepEqual(totals, [
    { slug: 'en-brenton-lxx-ot', units: 22774, books: 37 },
    { slug: 'la-clementine-vulgate-ot', units: 23483, books: 39 }
  ]);
  assert.equal(
    db.prepare("SELECT text FROM bible_verses WHERE book_code='LXX-GEN' AND chapter=1 AND verse=1").get().text,
    'In the beginning God made the heaven and the earth.'
  );
  assert.deepEqual(ensureAncientVersionsImported(), []);
});
