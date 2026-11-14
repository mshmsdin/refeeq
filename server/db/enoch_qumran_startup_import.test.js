import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const testDbPath = path.join(tmpdir(), `rafeeq-enoch-qumran-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumranEnochImported } = await import('./enoch_qumran_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and repairs nine licensed Aramaic Enoch witnesses as separate partial sources', async () => {
  const db = getDb();
  db.prepare(`
    INSERT INTO bible_book_metadata
      (book_code, canonicality_status, textual_tradition, original_language, text_status,
       arabic_status, english_status, future_translation_status, summary_ar, source_name, source_url, source_notes)
    VALUES ('ENO', 'non_canonical', 'ethiopic', 'الجعزية', 'complete', 'planned', 'available', 'planned',
      'نص أخنوخ الأول الكامل في التقليد الإثيوبي.', 'ترجمة تشارلز الإنجليزية', 'https://example.org/enoch', 'حالة الشاهد الكامل.')
  `).run();
  const metadata = db.prepare(`
    SELECT text_status, original_language, source_name, source_url, source_notes
    FROM bible_book_metadata WHERE book_code='ENO'
  `).get();
  assert.equal(await ensureQumranEnochImported(), true);
  const expected = [
    ['4Q204', 'arc-qdr-4q204-enoch-2026', 126, 11],
    ['4Q205', 'arc-qdr-4q205-enoch-2026', 31, 5],
    ['4Q206', 'arc-qdr-4q206-enoch-2026', 86, 12],
    ['4Q207', 'arc-qdr-4q207-enoch-2026', 6, 1],
    ['4Q208', 'arc-qdr-4q208-enoch-2026', 124, 38],
    ['4Q209', 'arc-qdr-4q209-enoch-2026', 171, 46],
    ['4Q210', 'arc-qdr-4q210-enoch-2026', 25, 2],
    ['4Q211', 'arc-qdr-4q211-enoch-2026', 16, 3],
    ['4Q212', 'arc-qdr-4q212-enoch-2026', 55, 5]
  ];

  for (const [witness, slug, units, groups] of expected) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='ENO' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, units, `${witness} unit count`);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, groups, `${witness} group count`);
    assert.ok(rows.every(({ text, source_url }) => text.startsWith(`‹${witness} frg. `) && source_url.includes('#')));
  }

  const id = db.prepare("SELECT id FROM bible_translations WHERE slug='arc-qdr-4q204-enoch-2026'").get().id;
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='ENO' AND chapter=1 AND verse=1").run(id);
  assert.equal(await ensureQumranEnochImported(), true);
  assert.match(db.prepare("SELECT text FROM bible_verses WHERE translation_id=? AND book_code='ENO' AND chapter=1 AND verse=1").get(id).text, /^‹4Q204 frg\./u);
  assert.equal(await ensureQumranEnochImported(), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id IN (SELECT id FROM bible_translations WHERE slug LIKE \'arc-qdr-4q2%enoch-2026\')').get().count, 640);
  assert.deepEqual(db.prepare(`
    SELECT text_status, original_language, source_name, source_url, source_notes
    FROM bible_book_metadata WHERE book_code='ENO'
  `).get(), metadata);
});
