import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-pseudo-jubilees-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensurePseudoJubileesImported } = await import('./pseudo_jubilees_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');
const { readFile } = await import('node:fs/promises');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports separate partial 4Q225 and 4Q226 witnesses, repairs drift, and avoids duplicates', async () => {
  assert.equal(await ensurePseudoJubileesImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books
    WHERE code IN ('ABR', 'PSJUBA', 'PSJUBB', 'AABR') ORDER BY canonical_order
  `).all(), [
    { code: 'ABR', canonical_order: 12 },
    { code: 'PSJUBA', canonical_order: 12.5 },
    { code: 'PSJUBB', canonical_order: 12.6 },
    { code: 'AABR', canonical_order: 13 }
  ]);

  const expectedWitnesses = [
    { witness: '4Q225', slug: 'he-qdr-4q225-pseudo-jubilees-a-2026', bookCode: 'PSJUBA', units: 49, groups: 5 },
    { witness: '4Q226', slug: 'he-qdr-4q226-pseudo-jubilees-b-2026', bookCode: 'PSJUBB', units: 64, groups: 14 }
  ];
  for (const item of expectedWitnesses) {
    const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === item.slug);
    assert.ok(source);
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(item.slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const readRows = () => db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, item.bookCode);
    const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
      .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
    assert.deepEqual(readRows(), expected);
    assert.equal(readRows().length, item.units);
    assert.equal(new Set(readRows().map(({ chapter }) => chapter)).size, item.groups);
    assert.equal(new Set(readRows().map(({ source_url }) => source_url)).size, item.units);
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(item.bookCode).text_status, 'partial');
  }

  const first = db.prepare("SELECT id FROM bible_translations WHERE slug='he-qdr-4q225-pseudo-jubilees-a-2026'").get();
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='PSJUBA' AND chapter=1 AND verse=1").run(first.id);
  assert.equal(await ensurePseudoJubileesImported(), true);
  assert.match(db.prepare("SELECT text FROM bible_verses WHERE translation_id=? AND book_code='PSJUBA' AND chapter=1 AND verse=1").get(first.id).text, /^‹4Q225 frg\. 1, line 1›/u);
  assert.equal(await ensurePseudoJubileesImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code IN ('PSJUBA','PSJUBB')").get().count, 113);
});
