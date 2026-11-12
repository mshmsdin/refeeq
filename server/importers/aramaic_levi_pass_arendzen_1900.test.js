import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedUnitText } from './reviewed_text_source.js';

test('imports the printed Aramaic Cambridge fragment without filling lacunae', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'aramaic-levi-cambridge-pass-arendzen-1900');
  assert.ok(source, 'missing the Pass and Arendzen printed fragment');
  assert.equal(source.bookCode, 'ARL');
  assert.equal(source.language, 'aramaic');
  assert.equal(source.incomplete, true);
  assert.equal(source.siteScope, 'both');
  assert.equal(source.expectedUnitCount, 2);
  assert.deepEqual(source.expectedUnitLocations, [[1, 1], [4, 1]]);

  const rawText = await readFile(source.textFile, 'utf8');
  const rows = parseReviewedUnitText(rawText, source);
  assert.deepEqual(rows.map(({ chapter, verse }) => [chapter, verse]), [[1, 1], [4, 1]]);
  assert.ok(rows.every((row) => /[\u0590-\u05ff]/u.test(row.text)));
  assert.ok(rows.every((row) => !/[\u0600-\u06ff]/u.test(row.text)));
  assert.match(rows[0].text, /15\. … מאת/);
  assert.match(rows[1].text, /23\. ולא ישכחון מטמוריה ולא$/u);
  assert.match(rows[1].text, /\[קרא\]תי/);
  assert.match(source.notes, /١٩٠٠/u);
  assert.match(source.notes, /تي إس ١٦٫٩٤/u);
  assert.match(source.notes, /جيستور/u);
  assert.match(source.notes, /٢٠٢٤/u);
});
