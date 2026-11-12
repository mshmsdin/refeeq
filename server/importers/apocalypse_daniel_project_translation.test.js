import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const textFile = new URL('./data/apocalypse_daniel_greek_project_english.json', import.meta.url);
const expectedLocationRanges = [
  '1:1-4,9-17', '2:1-17', '3:1-10,12-14', '4:1-12,14-18', '5:1-4,8-11',
  '6:2,4-6,11-14', '7:1-7', '8:1-27', '9:1-7', '10:1-11', '11:1-13', '12:1-13', '13:1-16',
];
const expectedUnitLocations = expectedLocationRanges.flatMap((range) => {
  const [chapter, verses] = range.split(':');
  return verses.split(',').flatMap((part) => {
    const [start, end = start] = part.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, index) => [Number(chapter), start + index]);
  });
});

test('project translation of the Greek Apocalypse of Daniel covers all source units', async () => {
  const rawText = await readFile(textFile, 'utf8');
  const units = JSON.parse(rawText);

  assert.equal(units.length, 170);
  assert.equal(new Set(units.map(({ chapter, verse }) => `${chapter}:${verse}`)).size, 170);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), expectedUnitLocations);
  assert.ok(units.every(({ text }) => typeof text === 'string' && text.trim().length >= 10));

  const imported = parseReviewedUnitText(rawText, {
    slug: 'en-project-apocalypse-daniel-greek',
    url: 'https://raw.githubusercontent.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/master/static/docs/ApDan.xml',
    maxChapter: 13,
    expectedUnitCount: 170,
    expectedWordCount: 2482,
    expectedUnitLocations,
    expectedSha256: 'be5ebc409838afdc39eca4c64ccadb3bf3241dca961614d30ecd5497a58db195',
  });

  assert.equal(imported.length, 170);
});
