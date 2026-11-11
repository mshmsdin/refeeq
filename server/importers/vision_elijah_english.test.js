import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports a complete English translation of all eleven OCP Latin Elijah vision units', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-project-vision-elijah-latin');
  assert.ok(source, 'missing English translation of the Latin Vision of Elijah');
  assert.equal(source.bookCode, 'VISEL');
  assert.equal(source.kind, 'reviewed-unit-text-file');
  assert.equal(source.language, 'en');
  assert.equal(source.expectedUnitCount, 11);
  assert.equal(source.expectedWordCount, 220);
  assert.match(source.notes, /ترجمة إنجليزية جديدة أعدها المشروع/u);
  assert.match(source.notes, /اللفظ اللاتيني الملتبس/u);

  const rawText = await readFile(source.textFile, 'utf8');
  const units = parseReviewedUnitText(rawText, source);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), Array.from({ length: 11 }, (_, i) => [1, i + 1]));
  assert.match(units[0].text, /^Finally, the prophet Elijah bears witness that he saw/u);
  assert.match(units[3].text, /\[meaning uncertain\]/u);
  assert.match(units[6].text, /adulterers and pederasts/u);
  assert.match(units.at(-1).text, /because of this/u);
});
