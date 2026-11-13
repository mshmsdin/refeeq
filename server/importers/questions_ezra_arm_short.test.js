import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('keeps the 14-unit Armenian Questions of Ezra recension B disabled while rights and transcription remain unresolved', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-questions-ezra-arm-short');
  assert.ok(source, 'missing the locally preserved recension B work file');
  assert.equal(source.bookCode, 'QEZRA');
  assert.equal(source.incomplete, false, 'recension B survives as a complete witness');
  assert.equal(source.importEligible, false);
  assert.equal(source.siteScope, 'both');
  assert.equal(source.expectedUnitCount, 14);
  assert.equal(source.expectedVerseNumbers.join(','), '1,2,3,4,5,6,7,8,9,10,11,12,13,14');

  const rawText = await readFile(source.textFile, 'utf8');
  const rows = parseReviewedUnitText(rawText, source);

  assert.equal(rows.length, 14);
  assert.ok(rows[0].text.startsWith("The prophet Ezra saw God's angel"));
  assert.match(rows[13].text, /judge the earth.*according to that person's deeds\./i);
  assert.match(source.notes, /١٧٣٠/);
  assert.match(source.notes, /حقوق.*غير محسومة/);
});
