import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `acts-john-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureActsJohnImported } = await import('./acts_john_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the surviving Acts of John sections once and keeps the work partial', async () => {
  const db = getDb();
  assert.equal(await ensureActsJohnImported(), true);
  const book = db.prepare("SELECT canonical_order FROM bible_books WHERE code='ACTJOHN'").get();
  assert.equal(book.canonical_order, 41.5);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-james-acts-john-1924'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'public-domain-text' });
  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ACTJOHN' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 96);
  assert.equal(rows[0].verse, 18);
  assert.equal(rows.at(-1).verse, 115);
  assert.deepEqual(rows.filter(({ verse }) => [56, 57].includes(verse)), []);
  assert.ok(rows.every(({ source_url }) => source_url === 'https://www.earlychristianwritings.com/text/actsjohn.html'));
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='ACTJOHN'").get().text_status, 'partial');

  const first = rows[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='ACTJOHN' AND chapter=? AND verse=?`)
    .run(translation.id, first.chapter, first.verse);
  assert.equal(await ensureActsJohnImported(), true);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ACTJOHN' ORDER BY chapter, verse`).all(translation.id), rows);
  assert.equal(await ensureActsJohnImported(), false);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => slug === 'en-james-acts-john-1924').length, 1);
});
