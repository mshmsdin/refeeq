import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { cleanHtmlVerse, decodeHtml, parseApocalypseMosesHtml } = await import('./import_noncanonical_english.js');

// بنية مصدر رؤيا موسى في صفحة ccel.org: أعداد من الإصحاح 37 (4 و6) تأتي بعد الإصحاح 39 تحت علامة منفردة في سطر.
test('رؤيا موسى: العلامة المنفردة تنسب الأعداد التالية إلى إصحاحها الحقيقي', () => {
  const html = [
    '<p>\n  i 1 Alpha one.<br>\n  2 Alpha two.',
    '<p>\n  ii 1 Beta one.<br>\n  2 Beta two<br>\n  3 more beta.',
    '<p>\n  iii 1 Gamma one.<br>\n  2 Gamma two.<p>\n  ii<br>\n  4 Late beta four.<br>\n  6 late beta six.'
  ].join('\n');
  const rows = parseApocalypseMosesHtml(html, { slug: 'fixture', maxChapter: 3, url: 'https://example.test' });
  const byChapter = Object.groupBy(rows, (row) => row.chapter);
  assert.deepEqual(byChapter[2].map((row) => row.verse), [1, 2, 3, 4, 6]);
  assert.deepEqual(byChapter[3].map((row) => row.verse), [1, 2]);
  assert.equal(byChapter[2].find((row) => row.verse === 4).text, 'Late beta four.');
  assert.equal(rows.some((row) => /^ii$/i.test(row.text) || / ii$/.test(row.text)), false, 'علامة الإصحاح لا تُلصق بنص عدد');
  assert.equal(rows.length, 9);
});

test('رؤيا موسى: سطر مفرد يشبه رقماً رومانياً لا يغيّر الإصحاح إن لم يتبعه عدد', () => {
  const html = [
    '<p>\n  i 1 Alpha one.<br>\n  2 Alpha two<br>\n  did<br>\n  and more.',
    '<p>\n  ii 1 Beta one.'
  ].join('\n');
  const rows = parseApocalypseMosesHtml(html, { slug: 'fixture', maxChapter: 2, url: 'https://example.test' });
  assert.equal(rows.find((row) => row.chapter === 1 && row.verse === 2).text, 'Alpha two did and more.');
});

test('اليوبيلات: الحرف الزخرفي الأول يُحفظ ويُلصق بباقي الكلمة', () => {
  const html = '<span class="dropcap-wrap"><img src="x.webp" alt="A" class="dropcap" /><span class="dropcap-fallback" style="display:none;">A</span><sup class="verse-number">1</sup></span><span class="verse-link-icon" data-verse="1" title="Copy link to verse">x</span>\n        nd in the third week she bare a son.';
  assert.equal(cleanHtmlVerse(html), 'And in the third week she bare a son.');
});

test('الأعداد غير الأولى تبقى كما هي', () => {
  const html = '<sup class="verse-number">2</sup><span class="verse-link-icon" data-verse="2" title="x">y</span>\n        And Moses went up.';
  assert.equal(cleanHtmlVerse(html), 'And Moses went up.');
});

test('رموز الحروف اللاتينية المعلّمة في أسماء الأعلام تُفك إلى حروفها', () => {
  assert.equal(decodeHtml('&Ocirc;r&acirc; S&ecirc;r&ocirc;h &Ucirc;r'), 'Ôrâ Sêrôh Ûr');
  assert.equal(decodeHtml('&unknown; &amp; &#39;'), "&unknown; & '");
});
