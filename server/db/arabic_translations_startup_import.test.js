import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `arabic-translations-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureArabicTranslationsImported } = await import('./arabic_translations_startup_import.js');
const { getBook, getTranslations } = await import('../utils/bible_service.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the complete machine-assisted Arabic Bible translations', () => {
  const imported = ensureArabicTranslationsImported();
  assert.deepEqual(imported.sort(), ['1MCE', '2MCE', '3MCE']);
  const db = getDb();
  const totals = db.prepare(`
    SELECT bt.slug, bt.name_ar, COUNT(*) AS units FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug LIKE 'ar-mohammad-%'
    GROUP BY bt.slug ORDER BY bt.slug
  `).all();
  assert.deepEqual(totals, [
    { slug: 'ar-mohammad-1mce', name_ar: 'ترجمة محمد بن شمس الدين', units: 240 },
    { slug: 'ar-mohammad-2mce', name_ar: 'ترجمة محمد بن شمس الدين', units: 421 },
    { slug: 'ar-mohammad-3mce', name_ar: 'ترجمة محمد بن شمس الدين', units: 208 }
  ]);
  assert.deepEqual(ensureArabicTranslationsImported(), []);
  for (const code of ['1MCE', '2MCE', '3MCE']) {
    assert.ok(getBook(code).available_translations.includes(`ar-mohammad-${code.toLowerCase()}`), code);
  }
  assert.equal(getTranslations().filter((item) => item.slug.startsWith('ar-mohammad-')).length, 3);
});
