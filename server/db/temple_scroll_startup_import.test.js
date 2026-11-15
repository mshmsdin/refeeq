import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `temple-scroll-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureTempleScrollImported } = await import('./temple_scroll_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup imports and verifies all 1,071 licensed Temple Scroll lines once', async () => {
  assert.equal(await ensureTempleScrollImported(), true);
  const db = getDb();
  const state = db.prepare(`
    SELECT bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_urls,
      bb.chapter_count, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='TSCROLL'
    LEFT JOIN bible_books bb ON bb.code='TSCROLL'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='TSCROLL'
    WHERE bt.slug='heb-qdr-11q19-temple-scroll-2025'
    GROUP BY bt.id
  `).get();
  assert.deepEqual(state, {
    language: 'he', source_type: 'cc-by-sa-4.0', site_scope: 'both', is_active: 1,
    units: 1071, source_urls: 1071, chapter_count: 1, text_status: 'partial'
  });
  assert.equal(await ensureTempleScrollImported(), false);
});
