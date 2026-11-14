import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `wikisource-inline-verses-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { run, SOURCES } = await import('./import_noncanonical_english.js');

const source = SOURCES.find(({ bookCode }) => bookCode === '1MCE');
const previousFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = previousFetch;
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('splits inline zero-width verse numbers in 1 Meqabyan chapter 1', async () => {
  const chapters = [
    '==Chapter 1==\n\n1 First complete test verse.\n\n16 Sixteenth verse text. ​17 Seventeenth verse text. ​18 Eighteenth verse text.'
  ];
  for (let chapter = 2; chapter <= 7; chapter += 1) {
    chapters.push(`==Chapter ${chapter}==\n\n1 Complete chapter ${chapter} test verse.`);
  }
  const wikitext = `{{delete}}\n${chapters.join('\n\n')}`;
  globalThis.fetch = async () => new Response(JSON.stringify({ parse: { wikitext: { '*': wikitext } } }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  initDatabase();
  initBibleSchema();
  await run([source.slug], { initializeDatabase: false });

  const db = getDb();
  const translation = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug);
  const rows = db.prepare(`
    SELECT verse, text FROM bible_verses
    WHERE translation_id=? AND book_code='1MCE' AND chapter=1 AND verse BETWEEN 16 AND 18
    ORDER BY verse
  `).all(translation.id);

  assert.deepEqual(rows.map(({ verse }) => verse), [16, 17, 18]);
  assert.deepEqual(rows.map(({ text }) => text), [
    'Sixteenth verse text.',
    'Seventeenth verse text.',
    'Eighteenth verse text.'
  ]);
});
