import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `bible-translations-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { getTranslations } = await import('./bible_service.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('lists active translations only when the current site has verse text for them', () => {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO bible_translations (slug, name_ar, name_en, abbreviation, site_scope, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const availableId = Number(insert.run('test-available', 'متاحة للاختبار', 'Available test', 'T-A', 'both', 1).lastInsertRowid);
  insert.run('test-empty', 'بلا نص للاختبار', 'Empty test', 'T-E', 'both', 1);
  insert.run('test-other-site', 'لموقع آخر', 'Other site', 'T-O', 'bible', 1);
  const bookExists = db.prepare("SELECT 1 FROM bible_books WHERE code='GEN'").get();
  assert.ok(bookExists);
  db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text)
    VALUES (?, 'GEN', 1, 1, 'نص اختبار', 'نص اختبار')
  `).run(availableId);

  const slugs = getTranslations().map(({ slug }) => slug);
  assert.ok(slugs.includes('test-available'));
  assert.ok(!slugs.includes('test-empty'));
  assert.ok(!slugs.includes('test-other-site'));
});
