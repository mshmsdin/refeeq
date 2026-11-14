import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `1es-mohammad-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensure1EsMohammadImported } = await import('./1es_mohammad_startup_import.js');
const { getBook, getChapterAcrossTranslations, getTranslations } = await import('../utils/bible_service.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports complete Arabic and Greek 1 Esdras witnesses idempotently', () => {
  assert.equal(ensure1EsMohammadImported(), true);
  const db = getDb();

  assert.deepEqual(db.prepare(`
    SELECT bt.slug, bt.language, bt.site_scope, COUNT(bv.id) AS units
    FROM bible_translations bt JOIN bible_verses bv ON bv.translation_id=bt.id
    WHERE bv.book_code='1ES' AND bt.slug IN ('ar-mohammad-1es','grc-brenton-1es')
    GROUP BY bt.slug ORDER BY bt.slug
  `).all(), [
    { slug: 'ar-mohammad-1es', language: 'ar', site_scope: 'bible', units: 448 },
    { slug: 'grc-brenton-1es', language: 'grc', site_scope: 'bible', units: 448 }
  ]);
  assert.equal(db.prepare(`
    SELECT text FROM bible_verses
    WHERE translation_id=(SELECT id FROM bible_translations WHERE slug='grc-brenton-1es')
      AND book_code='1ES' AND chapter=8 AND verse=18
  `).get().text.startsWith('καὶ τὰ λοιπά, ὅσα ἂν ὑποπίπτῃ'), true);
  assert.equal(db.prepare(`
    SELECT arabic_status FROM bible_book_metadata WHERE book_code='1ES'
  `).get().arabic_status, 'available');
  const ids = db.prepare(`
    SELECT id FROM bible_translations WHERE slug IN ('ar-mohammad-1es','grc-brenton-1es')
    ORDER BY slug
  `).all().map(({ id }) => id);
  const chapterRows = getChapterAcrossTranslations('1ES', 1, ids);
  assert.equal(chapterRows.length, 116);
  assert.equal(new Set(chapterRows.map(({ verse }) => verse)).size, 58);
  assert.equal(ensure1EsMohammadImported(), false);
  assert.ok(getBook('1ES').available_translations.includes('ar-mohammad-1es'));
  assert.ok(getTranslations().some((item) => item.slug === 'ar-mohammad-1es'));
});
