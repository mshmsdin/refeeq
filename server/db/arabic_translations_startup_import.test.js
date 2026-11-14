import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `arabic-translations-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureArabicTranslationsImported } = await import('./arabic_translations_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the three Ethiopic Maccabees Arabic translations with exact unit counts', () => {
  assert.deepEqual(ensureArabicTranslationsImported(), ['1MCE', '2MCE', '3MCE']);
  const rows = getDb().prepare(`
    SELECT bv.book_code, COUNT(*) AS units FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug LIKE 'ar-mohammad-%mce' GROUP BY bv.book_code ORDER BY bv.book_code
  `).all();
  assert.deepEqual(rows, [
    { book_code: '1MCE', units: 240 }, { book_code: '2MCE', units: 421 }, { book_code: '3MCE', units: 208 }
  ]);
  const names = getDb().prepare("SELECT DISTINCT name_ar, source_type FROM bible_translations WHERE slug LIKE 'ar-mohammad-%mce'").all();
  assert.deepEqual(names, [{ name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation' }]);
  assert.deepEqual(ensureArabicTranslationsImported(), []);
});
