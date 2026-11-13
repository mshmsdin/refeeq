import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const EXPECTED = [
  { witness: '4Q543', units: 123, sections: 42 },
  { witness: '4Q544', units: 24, sections: 3 },
  { witness: '4Q545', units: 76, sections: 13 },
  { witness: '4Q546', units: 103, sections: 27 },
  { witness: '4Q547', units: 60, sections: 9 },
  { witness: '4Q548', units: 23, sections: 3 },
  { witness: '4Q549', units: 14, sections: 2 }
];

test('preserves each licensed Qumran Digital Amram manuscript separately', async () => {
  for (const item of EXPECTED) {
    const slug = `arc-qdr-visions-amram-${item.witness.toLowerCase()}-2026`;
    const source = ADDITIONAL_SOURCES.find(({ slug: value }) => value === slug);
    assert.ok(source, `${item.witness} has its own registered source`);
    assert.equal(source.bookCode, 'AMRAM');
    assert.equal(source.language, 'arc');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedUnitCount, item.units);
    assert.equal(source.expectedChapterVerseNumbers.length, item.sections);

    const units = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
    assert.equal(units.length, item.units);
    assert.equal(new Set(units.map(({ chapter }) => chapter)).size, item.sections);
    assert.ok(units.every(({ text, sourceUrl }) => text.startsWith(`‹${item.witness} frg. `)
      && sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${item.witness}/`)
      && sourceUrl.includes('#')));
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, item.units);
  }
});
