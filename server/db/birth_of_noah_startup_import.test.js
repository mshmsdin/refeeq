import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-birth-noah-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureBirthOfNoahImported } = await import('./birth_of_noah_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports three separately partial, licensed Aramaic Birth of Noah witnesses', async () => {
  assert.equal(await ensureBirthOfNoahImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books
    WHERE code IN ('ENO2', 'NOAH', 'BNOAH', 'GIANTS') ORDER BY canonical_order
  `).all(), [
    { code: 'ENO2', canonical_order: 8 },
    { code: 'NOAH', canonical_order: 8.5 },
    { code: 'BNOAH', canonical_order: 8.6 },
    { code: 'GIANTS', canonical_order: 9 }
  ]);

  const expected = [
    ['4Q534', 'arc-qdr-4q534-birth-noah-2026', 51, 7],
    ['4Q535', 'arc-qdr-4q535-birth-noah-2026', 12, 3],
    ['4Q536', 'arc-qdr-4q536-birth-noah-2026', 25, 4]
  ];
  for (const [witness, slug, unitCount, sectionCount] of expected) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='BNOAH' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, unitCount);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, sectionCount);
    assert.equal(new Set(rows.map(({ source_url }) => source_url)).size, unitCount);
    assert.ok(rows.every(({ text, source_url }) => text.startsWith(`‹${witness} frg. `)
      && source_url.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${witness}/`)
      && source_url.includes('#')));
  }
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='BNOAH'").get().text_status, 'partial');

  const first = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(expected[0][1]);
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='BNOAH' AND chapter=1 AND verse=1").run(first.id);
  assert.equal(await ensureBirthOfNoahImported(), true);
  assert.match(db.prepare("SELECT text FROM bible_verses WHERE translation_id=? AND book_code='BNOAH' AND chapter=1 AND verse=1").get(first.id).text, /^‹4Q534 frg\./u);
  assert.equal(await ensureBirthOfNoahImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='BNOAH'").get().count, 88);
});
