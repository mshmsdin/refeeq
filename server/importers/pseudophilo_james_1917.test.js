import test from 'node:test';
import { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `pseudophilo-james-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { ADDITIONAL_SOURCES } = await import('./import_noncanonical_english.js');
const { parseReviewedChapterText } = await import('./reviewed_text_source.js');
const { ensurePseudoPhiloJamesImported } = await import('../db/pseudo_philo_james_startup_import.js');

initDatabase();
initBibleSchema();

after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all surviving James 1917 chapters without hiding the manuscript gaps or lost ending', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-james-biblical-antiquities');
  assert.ok(source, 'missing Pseudo-Philo source metadata');
  assert.equal(source.incomplete, true, 'the shared lacunae and lost ending must remain partial');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.maxChapter, 65);
  const rawText = await readFile(source.textFile, 'utf8');
  const rows = parseReviewedChapterText(rawText, source);
  assert.equal(rows.length, 65);
  assert.deepEqual(rows.map((row) => row.chapter), Array.from({ length: 65 }, (_, i) => i + 1));
  const samson = rows.find((row) => row.chapter === 43).text;
  const phinehas = rows.find((row) => row.chapter === 47).text;
  assert.match(samson, /Eluma conceived and bare a son/);
  assert.ok(samson.endsWith('And he judged Israel twenty years.'));
  assert.match(phinehas, /Phinees added and said/);
  assert.match(phinehas, /mighty lion in the midst of the forest/);
  assert.match(phinehas, /12\. And at that time did the Lord requite/);
  assert.ok(phinehas.endsWith('even as the Lord had spoken concerning them.'));
  assert.ok(rows[0].text.startsWith('The beginning of the world.'));
  assert.ok(rows.at(-1).text.length > 100);
  assert.match(source.notes, /٣٧:١\/٢/);
  assert.match(source.notes, /٣٧:٥\/٣٨:١/);
  assert.match(source.notes, /خاتمة العمل ضائعة/);
  assert.match(source.notes, /Scanned at sacred-texts\.com, May 2004\./);
});

test('repairs missing chapters 43 and 47 on startup and verifies every stored unit', async () => {
  assert.equal(await ensurePseudoPhiloJamesImported(), true);
  const db = getDb();
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-james-biblical-antiquities');
  const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id;
  const expected = parseReviewedChapterText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));

  const loadRows = () => db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='PSLAB' ORDER BY chapter, verse
  `).all(translationId);
  assert.deepEqual(loadRows(), expected);
  assert.equal(new Set(loadRows().map(({ chapter }) => chapter)).size, 65);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='PSLAB'").get().text_status, 'partial');

  db.prepare("DELETE FROM bible_verses WHERE translation_id=? AND chapter IN (43, 47)").run(translationId);
  assert.equal(await ensurePseudoPhiloJamesImported(), true);
  assert.deepEqual(loadRows(), expected);
  assert.equal(await ensurePseudoPhiloJamesImported(), false);
});
