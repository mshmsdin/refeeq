import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports only the seven Greek verso lines of the 1912 Elijah papyrus as partial', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'grc-psi-i-7-apocalypse-elijah-1912');
  assert.ok(source, 'missing the public-domain PSI I 7 Greek fragment');
  assert.equal(source.bookCode, 'APOCEL');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.incomplete, true, 'seven preserved lines must remain a partial witness');
  assert.equal(source.expectedUnitCount, 7);
  assert.deepEqual(source.expectedVerseNumbers, [1, 2, 3, 4, 5, 6, 7]);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.deepEqual(units.map(({ verse }) => verse), [1, 2, 3, 4, 5, 6, 7]);
  assert.match(units[0].text, /κρίνει τοὺς/u);
  assert.match(units[4].text, /Ἠλείας καὶ Ἐν/u);
  assert.match(units[6].text, /υἱὸν τῆς ἀδικίας/u);
  assert.doesNotMatch(units.map(({ text }) => text).join('\n'), /γλωσσῶν|ταμερι/u,
    'the unidentified recto text must not be attributed to the Apocalypse');
});

test('keeps the Arabic reading as a separate, explicitly reconstructed parallel witness', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'ar-psi-i-7-apocalypse-elijah-editorial-parallel-1912');
  assert.ok(source, 'missing the Arabic rendering of the editor’s parallel-text explanation');
  assert.equal(source.bookCode, 'APOCEL');
  assert.equal(source.language, 'ar');
  assert.equal(source.incomplete, true);
  assert.match(source.notes, /ليست ترجمة حرفية للبردية اليونانية/u);
  assert.match(source.notes, /الشرح الألماني للنص القبطي الموازي/u);
  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.equal(units.length, 7);
  assert.match(units[0].text, /رعاة/u);
  assert.match(units[6].text, /ابن الإثم/u);
  assert.ok(units.some(({ text }) => text.includes('[…]')), 'reconstructions must remain marked');
});
