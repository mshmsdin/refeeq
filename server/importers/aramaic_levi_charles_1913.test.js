import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADDITIONAL_SOURCES } from './import_noncanonical_english.js';
import { parseReviewedChapterText } from './reviewed_text_source.js';

test('imports Charles 1913 Levi fragments as four partial, source-numbered sections', async () => {
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === 'en-charles-aramaic-levi-fragments-1913');
  assert.ok(source, 'missing Charles 1913 Aramaic Levi translation metadata');
  assert.equal(source.bookCode, 'ARL');
  assert.equal(source.kind, 'reviewed-chapter-text-file');
  assert.equal(source.incomplete, true, 'surviving fragments must never be labelled complete');
  assert.equal(source.expectedChapterCount, 4);
  assert.equal(source.expectedWordCount, 2686);

  const rawText = await readFile(source.textFile, 'utf8');
  const chapters = parseReviewedChapterText(rawText, source);
  assert.equal(chapters.reduce((total, chapter) => total + chapter.text.split(' ').filter(Boolean).length, 0), source.expectedWordCount);
  assert.deepEqual(chapters.map(({ chapter }) => chapter), [1, 2, 3, 4]);
  assert.equal(chapters.length, 4, 'each preserved source fragment is stored in its own unit');
  assert.match(chapters[0].text, /Cambridge Aramaic Fragment, columns a–b/);
  assert.match(chapters[1].text, /Bodleian Aramaic Fragment.*first-fruits of the earth/s);
  assert.match(chapters[2].text, /Greek fragment.*Verses 32b–66/s);
  assert.match(chapters[3].text, /Cambridge Aramaic Fragment, columns c–f.*nor\.\.\.$/is);
  assert.match(source.notes, /١٩١٣/);
  assert.match(source.notes, /ليست تفريغاً آرامياً أو يونانياً أصلياً/);
});
