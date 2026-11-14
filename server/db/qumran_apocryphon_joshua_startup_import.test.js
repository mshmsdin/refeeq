import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const testDbPath = path.join(tmpdir(), `rafeeq-apocryphon-joshua-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumranApocryphonJoshuaImported } = await import('./qumran_apocryphon_joshua_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and repairs the two licensed Joshua witnesses independently and idempotently', async () => {
  assert.equal(await ensureQumranApocryphonJoshuaImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, name_ar, canonical_order FROM bible_books WHERE code='APJOSH'
  `).get(), { code: 'APJOSH', name_ar: 'أبوكريفون يشوع (مزامير يشوع)', canonical_order: 27.5 });

  const expected = [
    ['4Q378', 'heb-qdr-4q378-apocryphon-joshua-a-2026', 155, 36],
    ['4Q379', 'heb-qdr-4q379-apocryphon-joshua-b-2026', 186, 44]
  ];
  for (const [witness, slug, units, groups] of expected) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='APJOSH' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, units);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, groups);
    assert.ok(rows.every(({ text, source_url }) => text.startsWith(`‹${witness} frg. `) && source_url.includes('#')));
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=\'APJOSH\'').get().text_status, 'partial');
  }

  const id = db.prepare("SELECT id FROM bible_translations WHERE slug='heb-qdr-4q378-apocryphon-joshua-a-2026'").get().id;
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='APJOSH' AND chapter=1 AND verse=1").run(id);
  assert.equal(await ensureQumranApocryphonJoshuaImported(), true);
  assert.match(db.prepare('SELECT text FROM bible_verses WHERE translation_id=? AND book_code=\'APJOSH\' AND chapter=1 AND verse=1').get(id).text, /^‹4Q378 frg\. 1, line 1›/u);
  assert.equal(await ensureQumranApocryphonJoshuaImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='APJOSH'").get().count, 341);
});
