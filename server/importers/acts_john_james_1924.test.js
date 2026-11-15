import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports only the surviving numbered sections of James 1924 Acts of John as partial', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-james-acts-john-1924');
  assert.ok(source, 'missing Acts of John source metadata');
  assert.equal(source.bookCode, 'ACTJOHN');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.language, 'en');
  assert.equal(source.incomplete, true, 'the gaps and fragmentary witness must remain partial');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.expectedUnitCount, 96);
  assert.deepEqual(source.expectedVerseNumbers, [
    ...Array.from({ length: 38 }, (_, index) => index + 18),
    ...Array.from({ length: 58 }, (_, index) => index + 58)
  ]);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
    source.expectedVerseNumbers.map((verse) => [1, verse]));
  assert.match(units[0].text, /Now John was hastening to Ephesus/u);
  assert.doesNotMatch(units.map((unit) => unit.text).join('\n'), /^(?:56|57)\s/m);
  assert.match(source.notes, /الترجمة.*١٩٢٤/u);
  assert.match(source.notes, /٥٦ و٥٧/u);
});
