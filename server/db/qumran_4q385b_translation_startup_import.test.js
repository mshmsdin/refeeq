import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q385b-en-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
let ensureQumran4Q385bTranslationImported;
try {
  ({ ensureQumran4Q385bTranslationImported } = await import('./qumran_4q385b_translation_startup_import.js'));
} catch {}

initDatabase();
initBibleSchema();

after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup installs and verifies all 7 English 4Q385b lines as a partial translation', async () => {
  assert.equal(typeof ensureQumran4Q385bTranslationImported, 'function');
  assert.equal(await ensureQumran4Q385bTranslationImported(), true);
  const states = getDb().prepare(`
    SELECT bt.slug, bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_links,
      COUNT(DISTINCT bv.chapter) AS fragment_groups, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='Q385B'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='Q385B'
    WHERE bt.slug IN ('heb-qdr-4q385b-words-ezekiel-2026', 'en-project-4q385b-words-ezekiel')
    GROUP BY bt.id ORDER BY bt.slug
  `).all();
  assert.deepEqual(states, [
    { slug: 'en-project-4q385b-words-ezekiel', language: 'en', source_type: 'project-translation', site_scope: 'both', is_active: 1, units: 7, source_links: 7, fragment_groups: 1, text_status: 'partial' },
    { slug: 'heb-qdr-4q385b-words-ezekiel-2026', language: 'he', source_type: 'cc-by-sa-4.0', site_scope: 'both', is_active: 1, units: 7, source_links: 7, fragment_groups: 1, text_status: 'partial' }
  ]);
  assert.equal(await ensureQumran4Q385bTranslationImported(), false);
});
