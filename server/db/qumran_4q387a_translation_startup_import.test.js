import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q387a-en-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumranApocryphonJeremiahImported } = await import('./qumran_apocryphon_jeremiah_startup_import.js');
let ensureQumran4Q387aTranslationImported;
try {
  ({ ensureQumran4Q387aTranslationImported } = await import('./qumran_4q387a_translation_startup_import.js'));
} catch {}

initDatabase();
initBibleSchema();

after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup imports all 32 English 4Q387a glosses as a partial translation', async () => {
  assert.equal(typeof ensureQumran4Q387aTranslationImported, 'function');
  await ensureQumranApocryphonJeremiahImported();
  assert.equal(await ensureQumran4Q387aTranslationImported(), true);
  const states = getDb().prepare(`
    SELECT bt.slug, bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_links,
      COUNT(DISTINCT bv.chapter) AS fragment_groups, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='AJC387A'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='AJC387A'
    WHERE bt.slug IN ('heb-qdr-4q387a-apocryphon-jeremiah-c-2026', 'en-project-4q387a-apocryphon-jeremiah-c')
    GROUP BY bt.id ORDER BY bt.slug
  `).all();
  assert.deepEqual(states, [
    { slug: 'en-project-4q387a-apocryphon-jeremiah-c', language: 'en', source_type: 'project-translation', site_scope: 'both', is_active: 1, units: 32, source_links: 32, fragment_groups: 9, text_status: 'partial' },
    { slug: 'heb-qdr-4q387a-apocryphon-jeremiah-c-2026', language: 'he', source_type: 'cc-by-sa-4.0', site_scope: 'both', is_active: 1, units: 32, source_links: 32, fragment_groups: 9, text_status: 'partial' }
  ]);
  assert.equal(await ensureQumran4Q387aTranslationImported(), false);
});
