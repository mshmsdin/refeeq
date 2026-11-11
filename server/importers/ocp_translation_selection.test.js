import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOcpChapters } from './import_noncanonical_english.js';

test('selects the requested English manuscript reading from a multilingual OCP source', () => {
  const xml = `<book>
    <version language="Latin"><text>
      <div number="1"><div number="1"><unit>
        <reading option="0" mss="CodA ">Latin text for the first day.</reading>
        <reading option="3" mss="Trans ">English text for the first day.</reading>
      </unit></div><div number="2"><unit>
        <reading option="0" mss="CodA ">Latin text for the second day.</reading>
        <reading option="3" mss="Trans ">English text for the second day.</reading>
      </unit></div></div>
    </text></version>
  </book>`;
  const source = {
    slug: 'ocp-translation-selection-test',
    versionLanguage: 'Latin',
    readingMss: 'Trans',
    maxChapter: 1,
    expectedUnits: 2,
    url: 'https://example.invalid/source.xml',
  };

  const units = parseOcpChapters(xml, source);

  assert.deepEqual(units.map(({ chapter, verse, text }) => [chapter, verse, text]), [
    [1, 1, 'English text for the first day.'],
    [1, 2, 'English text for the second day.'],
  ]);
});

test('fails when an OCP source does not contain the requested translation witness', () => {
  const xml = `<book><version language="Latin"><text>
    <div number="1"><div number="1"><unit>
      <reading option="0" mss="CodA ">Latin text for the first day.</reading>
    </unit></div></div>
  </text></version></book>`;

  assert.throws(() => parseOcpChapters(xml, {
    slug: 'ocp-missing-translation-test',
    versionLanguage: 'Latin', readingMss: 'Trans', maxChapter: 1, url: 'https://example.invalid/source.xml',
  }), /Trans/);
});
