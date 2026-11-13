import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `aramaic-levi-qdr-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureAramaicLeviQumranImported } = await import('./aramaic_levi_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all Qumran Digital Aramaic Levi witnesses once and repairs stale source lines', async () => {
  assert.equal(await ensureAramaicLeviQumranImported(), true);

  const db = getDb();
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug='arc-qdr-aramaic-levi-2026'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language,
    is_active: translation.is_active,
    site_scope: translation.site_scope,
    source_type: translation.source_type
  }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });

  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ARL' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(actual.length, 281);
  assert.equal(new Set(actual.map(({ source_url }) => source_url)).size, 281);
  assert.match(actual[0].source_url, /1Q21/u);
  assert.match(actual.at(-1).source_url, /4Q214b/u);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='ARL'").get().text_status, 'partial');

  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND verse=281").run(translation.id);
  assert.equal(await ensureAramaicLeviQumranImported(), true);
  assert.notEqual(db.prepare('SELECT text FROM bible_verses WHERE translation_id=? AND verse=281').get(translation.id).text, 'stale');
  assert.equal(await ensureAramaicLeviQumranImported(), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code=\'ARL\'').get(translation.id).count, 281);
});
