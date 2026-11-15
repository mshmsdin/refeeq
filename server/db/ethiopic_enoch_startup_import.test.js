import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `ethiopic-enoch-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureEthiopicEnochImported, ENOCH_GEEZ_SOURCE } = await import('./ethiopic_enoch_startup_import.js');

initDatabase();
initBibleSchema();
const db = getDb();
after(() => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and verifies the partial Ge’ez Rylands 23 witness at server startup', async () => {
  assert.equal(await ensureEthiopicEnochImported(), true);

  const source = ENOCH_GEEZ_SOURCE;
  const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?')
    .get(source.slug);
  assert.ok(translation);
  assert.deepEqual(
    [translation.language, translation.is_active, translation.site_scope, translation.source_type],
    ['gez', 1, 'both', 'cc-by-4.0']
  );

  const expected = JSON.parse(await readFile(source.textFile, 'utf8'))
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ENO' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, expected);
  assert.equal(actual.length, 542);
  assert.equal(new Set(actual.map(({ chapter }) => chapter)).size, 71);
  assert.equal(db.prepare("SELECT chapter_count FROM bible_books WHERE code='ENO'").get().chapter_count, 108);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='ENO'").get().text_status, 'partial');
  assert.equal(await ensureEthiopicEnochImported(), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code=\'ENO\'')
    .get(translation.id).count, 542);
});
