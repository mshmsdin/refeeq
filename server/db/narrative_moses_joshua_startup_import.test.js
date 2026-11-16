import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `narmos-english-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
let ensureNarrativeMosesJoshuaTranslation;
try {
  ({ ensureNarrativeMosesJoshuaTranslation } = await import('./narrative_moses_joshua_startup_import.js'));
} catch {}

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup installs and verifies all eight page groups of the partial English translation', async () => {
  assert.equal(typeof ensureNarrativeMosesJoshuaTranslation, 'function');
  assert.equal(await ensureNarrativeMosesJoshuaTranslation(), true);
  const state = getDb().prepare(`
    SELECT bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_pages,
      bb.chapter_count AS chapters, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='NARMOS'
    LEFT JOIN bible_books bb ON bb.code='NARMOS'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='NARMOS'
    WHERE bt.slug='en-project-narrative-moses-joshua-vassiliev-1893'
    GROUP BY bt.id
  `).get();
  assert.deepEqual(state, {
    language: 'en', source_type: 'project-translation', site_scope: 'both', is_active: 1,
    units: 8, source_pages: 8, chapters: 1, text_status: 'partial'
  });
  assert.equal(await ensureNarrativeMosesJoshuaTranslation(), false);
});
