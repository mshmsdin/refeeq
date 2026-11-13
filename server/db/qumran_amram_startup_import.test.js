import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-amram-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumranAmramImported } = await import('./qumran_amram_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and repairs every licensed Qumran Amram witness without merging manuscripts', async () => {
  assert.equal(await ensureQumranAmramImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books
    WHERE code IN ('TJOB', 'AMRAM', 'MOS') ORDER BY canonical_order
  `).all(), [
    { code: 'TJOB', canonical_order: 22 },
    { code: 'AMRAM', canonical_order: 23 },
    { code: 'MOS', canonical_order: 24 }
  ]);
  const expected = [
    ['4Q543', 123, 42], ['4Q544', 24, 3], ['4Q545', 76, 13], ['4Q546', 103, 27],
    ['4Q547', 60, 9], ['4Q548', 23, 3], ['4Q549', 14, 2]
  ];

  for (const [witness, unitCount, sectionCount] of expected) {
    const slug = `arc-qdr-visions-amram-${witness.toLowerCase()}-2026`;
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type
      FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language,
      is_active: translation.is_active,
      site_scope: translation.site_scope,
      source_type: translation.source_type
    }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='AMRAM' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, unitCount);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, sectionCount);
    assert.ok(rows.every(({ text, source_url }) => text.startsWith(`‹${witness} frg. `) && source_url.includes('#')));
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get('AMRAM').text_status, 'partial');
  }

  const firstSlug = 'arc-qdr-visions-amram-4q543-2026';
  const first = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(firstSlug);
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='AMRAM' AND verse=1 AND chapter=1").run(first.id);
  assert.equal(await ensureQumranAmramImported(), true);
  assert.match(db.prepare("SELECT text FROM bible_verses WHERE translation_id=? AND book_code='AMRAM' AND chapter=1 AND verse=1").get(first.id).text, /^‹4Q543 frg\./u);
  assert.equal(await ensureQumranAmramImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='AMRAM'").get().count, 423);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => slug.startsWith('arc-qdr-visions-amram-')).length, 7);
});
