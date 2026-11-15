import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  {
    slug: 'gez-betamasaheft-enoch-eotc-2026', bookCode: 'ENO', chapters: 108, units: 1058,
    first: 'ቃለ፡ በረከት፡ ዘሄኖክ፡', last: 'ወይጸርሑ፡ ወይሬእይዎሙ፡ ኃጥኣን፡',
  },
  {
    slug: 'gez-betamasaheft-jubilees-eotc-2026', bookCode: 'JUB', chapters: 50, units: 1292,
    first: 'ወኮነ፡ በቀዳሚ፡ ዓመት፡', last: 'ወሰብእ፡ ዘይገብር፡ ኵሎ፡',
  },
];

test('imports the complete licensed EOTC Ge\'ez editions of 1 Enoch and Jubilees as separate witnesses', async () => {
  for (const expected of EXPECTED) {
    const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === expected.slug);
    assert.ok(source, `missing source ${expected.slug}`);
    assert.equal(source.bookCode, expected.bookCode);
    assert.equal(source.language, 'gez');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.maxChapter, expected.chapters);
    assert.equal(source.expectedUnitCount, expected.units);
    assert.equal(source.expectedChapterCounts.length, expected.chapters);
    assert.ok(source.expectedChapterCounts.every((count) => Number.isInteger(count) && count > 0));
    assert.equal(source.expectedChapterCounts.reduce((sum, count) => sum + count, 0), expected.units);
    assert.match(source.url, /LIT(?:1340EnochE|1697Jubilees)\.xml/u);
    assert.match(source.notes, /المشاع الإبداعي النسب بالمثل ٤٫٠/u);
    assert.match(source.notes, /المطبوع/u);

    const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
    assert.equal(units.length, expected.units);
    assert.deepEqual(units.map(({ chapter }) => chapter), source.expectedChapterCounts.flatMap((count, index) =>
      Array.from({ length: count }, () => index + 1)));
    assert.equal(units[0].text.startsWith(expected.first), true);
    assert.equal(units.at(-1).text.includes(expected.last), true);
    assert.ok(units.every(({ sourceUrl, text }) => /#L\d+$/u.test(sourceUrl) && text.trim().length > 0));

    if (expected.bookCode === 'ENO') {
      const ch21 = units.filter(({ chapter }) => chapter === 21);
      assert.equal(ch21.length, 9);
      assert.equal(ch21[0].sourceVerseNumber, 2);
      assert.equal(ch21[0].verse, 1);
    }
  }
});
