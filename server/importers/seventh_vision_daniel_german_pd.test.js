import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the complete 1892 German witness translation of Daniel’s Seventh Vision', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-project-seventh-vision-daniel');
  assert.ok(source, 'missing the project English translation of the 1892 German witness');
  assert.equal(source.bookCode, 'SEVDAN');
  assert.equal(source.incomplete, false, 'Kalemkiar’s published witness reaches its closing prayer');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.expectedUnitCount, 14);
  assert.equal(source.expectedVerseNumbers.join(','), '1,2,3,4,5,6,7,8,9,10,11,12,13,14');

  const rawText = await readFile(source.textFile, 'utf8');
  const rows = parseReviewedUnitText(rawText, source);

  assert.equal(rows.length, 14);
  assert.ok(rows[0].text.startsWith('In the third year, after all the visions given to the prophet Daniel'));
  assert.match(rows[13].text, /Amen.’$/);
  assert.match(rows[3].text, /called Theodosius[\s\S]*named Marcianus/);
  assert.doesNotMatch(rows[3].text, /The manuscript calls him/);
  assert.match(rows[7].text, /German editor notes an uncertain Armenian reading/);
  assert.match(rows[6].text, /marks “road” as uncertain/);
  assert.match(source.notes, /كاليمكيار/);
  assert.match(source.notes, /١٨٩٢/);
  assert.match(source.notes, /ترجمة إنجليزية جديدة/);
  assert.match(source.notes, /صفحات/);
});
