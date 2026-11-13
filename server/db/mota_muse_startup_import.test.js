import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `mota-muse-startup-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureMotaMuseImported } = await import('./mota_muse_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports both Mota Muse witnesses at startup once and matches every source unit', async () => {
  assert.equal(await ensureMotaMuseImported(), true);

  const db = getDb();
  for (const slug of ['gez-opensiddur-mota-muse-2019', 'en-opensiddur-mota-muse-mayer-2019']) {
    const source = ADDITIONAL_SOURCES.find((entry) => entry.slug === slug);
    const translation = db.prepare('SELECT id, language, is_active, site_scope FROM bible_translations WHERE slug=?').get(slug);
    assert.ok(translation);
    assert.equal(translation.is_active, 1);
    assert.equal(translation.site_scope, 'both');

    const raw = await readFile(source.textFile, 'utf8');
    const expected = parseReviewedUnitText(raw, source).map(({ chapter, verse, text }) => ({ chapter, verse, text }));
    const actual = db.prepare(`
      SELECT chapter, verse, text FROM bible_verses
      WHERE translation_id=? AND book_code='MOTA-MUSE' ORDER BY chapter, verse
    `).all(translation.id);
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, 15);
  }

  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='MOTA-MUSE'").get().text_status, 'partial');
  assert.equal(await ensureMotaMuseImported(), false);
  assert.deepEqual(db.prepare(`
    SELECT bt.slug, COUNT(bv.id) AS unit_count
    FROM bible_translations bt JOIN bible_verses bv ON bv.translation_id=bt.id
    WHERE bv.book_code='MOTA-MUSE' AND bt.slug IN (?, ?)
    GROUP BY bt.slug ORDER BY bt.slug
  `).all('en-opensiddur-mota-muse-mayer-2019', 'gez-opensiddur-mota-muse-2019'), [
    { slug: 'en-opensiddur-mota-muse-mayer-2019', unit_count: 15 },
    { slug: 'gez-opensiddur-mota-muse-2019', unit_count: 15 }
  ]);
});
