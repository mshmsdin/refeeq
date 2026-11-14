import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `torah-witnesses-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureTorahWitnessesImported } = await import('./torah_witnesses_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the four public-domain Torah witnesses with exact unit counts', async () => {
  assert.equal(await ensureTorahWitnessesImported(), true);
  const db = getDb();
  const counts = db.prepare(`
    SELECT bt.slug, COUNT(*) AS units FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug IN ('arc-targum-onkelos-sefaria','arc-targum-pseudo-jonathan-sefaria','en-etheridge-targum-pseudo-jonathan-1862','jrb-saadia-tafsir-paris-1893')
    GROUP BY bt.slug ORDER BY bt.slug
  `).all();
  assert.deepEqual(counts, [
    { slug: 'arc-targum-onkelos-sefaria', units: 5846 },
    { slug: 'arc-targum-pseudo-jonathan-sefaria', units: 5838 },
    { slug: 'en-etheridge-targum-pseudo-jonathan-1862', units: 5761 },
    { slug: 'jrb-saadia-tafsir-paris-1893', units: 5846 }
  ]);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='TJ-GEN'").get().text_status, 'partial');
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='ONK-GEN'").get().text_status, 'complete');
  assert.equal(await ensureTorahWitnessesImported(), false);
});
