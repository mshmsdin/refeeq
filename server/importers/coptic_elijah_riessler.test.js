import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports only the fully proofread, public-domain 1928 German Elijah witness', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'de-riessler-coptic-apocalypse-elijah-1928');
  assert.ok(source, 'Rießler translation source is registered');
  assert.equal(source.bookCode, 'CAPEL');
  assert.equal(source.language, 'de');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);

  const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
  assert.equal(units.length, 166);
  assert.deepEqual([...new Set(units.map(({ chapter }) => chapter))], Array.from({ length: 26 }, (_, i) => i + 1));
  assert.deepEqual(Array.from({ length: 26 }, (_, chapter) => units.filter((unit) => unit.chapter === chapter + 1).length),
    [5, 4, 4, 5, 6, 6, 6, 7, 5, 4, 5, 5, 6, 5, 6, 5, 21, 7, 5, 5, 6, 21, 5, 5, 6, 1]);
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith('https://de.wikisource.org/w/index.php?title=Apokalypse_des_Elias&oldid=2834974#')
    && text.startsWith('‹Steindorff Seite ') && !text.includes('Erläuterungen')));
  assert.ok(units[0].text.includes('Das Wort des Herrn erging an mich'));
  assert.ok(units.at(-1).text.includes('mit dem Gesalbten tausend Jahre'));
});
