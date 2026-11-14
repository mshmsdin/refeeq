import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `jewish-sources-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureJewishSourcesImported } = await import('./jewish_sources_startup_import.js');
const { JEWISH_SOURCES_MANIFEST } = await import('../importers/jewish_sources_catalog.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('registers every harvested Jewish source work in the dedicated collection', () => {
  const db = getDb();
  const count = db.prepare(`
    SELECT COUNT(*) AS n FROM bible_books WHERE collection_id=(SELECT id FROM bible_collections WHERE slug='jewish-sources')
  `).get().n;
  assert.equal(count, JEWISH_SOURCES_MANIFEST.works.length);
  assert.ok(count > 200);
});

test('imports selected works with exact unit counts, license notes and honest status', async () => {
  const codes = ['MSH-MISHNAH-BERAKHOT', 'TB-BERAKHOT', 'YTZ-SEFER-YETZIRAH'];
  assert.deepEqual(await ensureJewishSourcesImported({ onlyCodes: codes }), codes);
  const db = getDb();
  for (const code of codes) {
    const work = JEWISH_SOURCES_MANIFEST.works.find((item) => item.code === code);
    for (const lang of ['he', 'en']) {
      if (!work[lang]) continue;
      const n = db.prepare(`
        SELECT COUNT(*) AS n FROM bible_verses bv JOIN bible_translations bt ON bt.id=bv.translation_id
        WHERE bt.slug=? AND bv.book_code=?
      `).get(work[lang].slug, code).n;
      assert.equal(n, work[lang].units, `${code} ${lang}`);
    }
  }
  const status = db.prepare("SELECT text_status, source_notes FROM bible_book_metadata WHERE book_code='TB-BERAKHOT'").get();
  assert.equal(status.text_status, 'complete');
  assert.match(status.source_notes, /١أ/);
  const license = db.prepare("SELECT source_notes FROM bible_translations WHERE slug=(SELECT slug FROM bible_translations WHERE name_en='Wikisource Talmud Bavli')").get();
  assert.match(license.source_notes, /CC BY-SA/);
  assert.deepEqual(await ensureJewishSourcesImported({ onlyCodes: codes }), []);
});
