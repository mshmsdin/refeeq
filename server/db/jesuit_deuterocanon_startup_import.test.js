import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `jesuit-deuterocanon-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureJesuitDeuterocanonImported } = await import('./jesuit_deuterocanon_startup_import.js');
const sourceUrl = new URL('../importers/data/jesuit_deuterocanon_1876_1880.json', import.meta.url);

initDatabase();
initBibleSchema();

after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all ten complete Jesuit Deuterocanon texts into both site scopes once', async () => {
  const source = JSON.parse(await readFile(sourceUrl, 'utf8'));
  assert.equal(await ensureJesuitDeuterocanonImported(), true);

  const db = getDb();
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug='ar-jesuit-dc'
  `).get();
  assert.deepEqual(translation, {
    id: translation.id,
    language: 'ar',
    is_active: 1,
    site_scope: 'both',
    source_type: 'public-domain-text'
  });

  for (const book of source.books) {
    const expected = book.chapters.flatMap((chapter) => chapter.verses.map((verse) => ({
      chapter: chapter.chapter,
      verse: verse.verse,
      text: verse.text,
      source_url: verse.sourceUrl
    })));
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, book.code);
    assert.deepEqual(actual, expected, `${book.code} must match the reviewed source file`);
    assert.equal(actual.length, book.unitCount, `${book.code} unit count`);
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(book.code).text_status, 'complete');
    assert.equal(db.prepare(`
      SELECT site_scope FROM bible_collections bc JOIN bible_books bb ON bb.collection_id=bc.id WHERE bb.code=?
    `).get(book.code).site_scope, 'both');
  }

  assert.equal(await ensureJesuitDeuterocanonImported(), false);
});
