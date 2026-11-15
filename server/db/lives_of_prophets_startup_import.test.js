import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `lives-of-prophets-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureLivesOfProphetsImported } = await import('./lives_of_prophets_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the complete 23-section Greek OCP edition and English translation with provenance', async () => {
  assert.equal(await ensureLivesOfProphetsImported(), true);
  const db = getDb();
  const book = db.prepare(`
    SELECT bb.canonical_order, bb.chapter_count, bbm.text_status
    FROM bible_books bb JOIN bible_book_metadata bbm ON bbm.book_code=bb.code
    WHERE bb.code='LPRO'
  `).get();
  assert.deepEqual(book, { canonical_order: 39.8, chapter_count: 23, text_status: 'complete' });

  const witnesses = [
    ['grc-ocp-lives-prophets-2026', 'grc', 'Ἡσαΐας', 'Ἐλισαῖος'],
    ['en-ocp-lives-prophets-2026', 'en', 'Isaiah', 'Elisha']
  ];
  for (const [slug, language, firstHeading, lastHeading] of witnesses) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type, display_order FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type,
      display_order: translation.display_order
    }, { language, is_active: 1, site_scope: 'both', source_type: 'cc-by-4.0', display_order: language === 'en' ? 40 : 41 });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='LPRO' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, 141);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, 23);
    assert.deepEqual(rows.filter(({ verse }) => verse === 1).map(({ chapter }) => chapter),
      Array.from({ length: 23 }, (_, index) => index + 1));
    assert.match(rows[0].text, new RegExp(firstHeading, 'u'));
    assert.match(rows.find(({ chapter, verse }) => chapter === 23 && verse === 1).text, new RegExp(lastHeading, 'u'));
    assert.ok(rows.every(({ source_url: url }) => url.includes('853a64b623de296d2b8532a43593607772e7c45a')));
  }
  assert.deepEqual(db.prepare(`
    SELECT bt.slug FROM bible_translations bt JOIN bible_verses bv ON bv.translation_id=bt.id
    WHERE bv.book_code='LPRO' GROUP BY bt.id ORDER BY bt.display_order
  `).all().map(({ slug }) => slug), ['en-ocp-lives-prophets-2026', 'grc-ocp-lives-prophets-2026']);
  assert.equal(await ensureLivesOfProphetsImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='LPRO'").get().count, 282);
});
