import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q539-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumran4Q539Imported } = await import('./qumran_4q539_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all licensed 4Q539 lines as a separate, partial Aramaic witness', async () => {
  const db = getDb();
  const josephMetadata = db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='JOSEPH'").get();
  assert.ok(josephMetadata);
  assert.equal(await ensureQumran4Q539Imported(), true);
  assert.deepEqual(db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='JOSEPH'").get(), josephMetadata);
  assert.deepEqual(db.prepare("SELECT alias FROM bible_book_aliases WHERE book_code='Q539' ORDER BY alias").all(), [
    { alias: '4QApocryphon of Joseph B' },
    { alias: 'Qumran Aramaic Witness 4Q539' },
    { alias: 'أبوكريفون يوسف ب' },
    { alias: 'الشاهد القمراني الآرامي 4Q539' },
    { alias: 'وصية يوسف' }
  ]);
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books WHERE code IN ('JOSEPH', 'Q539', 'TJOB')
    ORDER BY canonical_order
  `).all(), [
    { code: 'JOSEPH', canonical_order: 21 },
    { code: 'Q539', canonical_order: 21.5 },
    { code: 'TJOB', canonical_order: 22 }
  ]);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='arc-qdr-4q539-qumran-digital-2025'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 19);
  assert.deepEqual(rows.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, [0, 0, 0, 0]), [3, 7, 6, 3]);
  assert.ok(rows.every(({ text, source_url }) => text.startsWith('‹4Q539 frg. ')
    && source_url.startsWith('https://qumran.alexschapiro.com/transcriptions/4Q539/2025-08-25/index.html?v=2025-08-25#')));
  assert.match(rows[0].text, /ברגג/);
  assert.match(rows[3].text, /יעקוב/);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='Q539'").get().text_status, 'partial');
  const first = rows[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='Q539' AND chapter=? AND verse=?`)
    .run(translation.id, first.chapter, first.verse);
  assert.equal(await ensureQumran4Q539Imported(), true);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse`).all(translation.id), rows);
  assert.equal(await ensureQumran4Q539Imported(), false);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => slug === 'arc-qdr-4q539-qumran-digital-2025').length, 1);
});
