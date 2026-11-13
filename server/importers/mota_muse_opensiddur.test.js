import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the complete published Ge’ez witness and its licensed English translation as partial', async () => {
  const sources = [
    ['gez-opensiddur-mota-muse-2019', 'gez', /^ይትባረክ/u, /ወቀበርዎ ፡ ላእክት/u],
    ['en-opensiddur-mota-muse-mayer-2019', 'en', /^Blessed be/u, /Mosheh died and the angels buried him\./u]
  ];

  for (const [slug, language, firstText, lastText] of sources) {
    const source = ADDITIONAL_SOURCES.find((item) => item.slug === slug);
    assert.ok(source, `missing source ${slug}`);
    assert.equal(source.bookCode, 'MOTA-MUSE');
    assert.equal(source.language, language);
    assert.equal(source.kind, 'reviewed-unit-text-file');
    assert.equal(source.incomplete, true, 'Faitlovitch describes the manuscript witness as incomplete');
    assert.equal(source.expectedUnitCount, 15);
    assert.equal(source.expectedWordCount, language === 'gez' ? 2200 : 2068);
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.match(source.notes, /Jacques Faïtlovitch/u);
    assert.match(source.notes, /Isaac Gantwerk Mayer/u);
    assert.match(source.notes, /CC BY-SA 4\.0/u);
    assert.match(source.notes, /https:\/\/opensiddur\.org/u);

    const rawText = await readFile(source.textFile, 'utf8');
    const units = parseReviewedUnitText(rawText, source);
    assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
      Array.from({ length: 15 }, (_, index) => [1, index + 1]));
    assert.match(units[0].text, firstText);
    assert.match(units.at(-1).text, lastText);
  }
});
