import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q242-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
let ensureQumran4Q242Imported;
try {
  ({ ensureQumran4Q242Imported } = await import('./qumran_4q242_startup_import.js'));
} catch {}

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup installs and verifies the Aramaic witness and all 14 partial English line translations', async () => {
  assert.equal(typeof ensureQumran4Q242Imported, 'function');
  assert.equal(await ensureQumran4Q242Imported(), true);
  const rows = getDb().prepare(`
    SELECT bt.slug, bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_links,
      bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='Q242'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='Q242'
    WHERE bt.slug IN ('arc-qdr-4q242-prayer-nabonidus-2026', 'en-project-prayer-nabonidus-4q242')
    GROUP BY bt.id ORDER BY bt.slug
  `).all();
  assert.deepEqual(rows, [
    { slug: 'arc-qdr-4q242-prayer-nabonidus-2026', language: 'arc', source_type: 'cc-by-sa-4.0', site_scope: 'both', is_active: 1, units: 14, source_links: 14, text_status: 'partial' },
    { slug: 'en-project-prayer-nabonidus-4q242', language: 'en', source_type: 'project-translation', site_scope: 'both', is_active: 1, units: 14, source_links: 14, text_status: 'partial' }
  ]);
  assert.equal(await ensureQumran4Q242Imported(), false);
});
