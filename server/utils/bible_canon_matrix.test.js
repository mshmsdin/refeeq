import test from 'node:test';
import assert from 'node:assert/strict';
import { CANON_STATUSES, CANON_TRADITIONS, buildCanonCell, buildCanonMatrix } from './bible_canon_matrix.js';

const OT39 = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'];
const NT27 = ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'];
const book = (code, collection_slug = 'pseudepigrapha') => ({ code, name_ar: code, name_en: code, collection_slug, collection_name_ar: collection_slug, canonical_order: 1 });
const LIBRARY = [
  ...OT39.map((c) => book(c, 'old-testament')),
  ...NT27.map((c) => book(c, 'new-testament')),
  ...['TOB', 'JDT', '1MA', '2MA', 'WIS', 'SIR', 'BAR', '1ES', '2ES', 'MAN', 'PS2', '3MA', '4MA', 'DAG', 'ESG'].map((c) => book(c, 'deuterocanon')),
  ...['ENO', 'JUB', 'DID', 'GTH'].map((c) => book(c, 'apocrypha')),
  ...['1MCE', '2MCE', '3MCE', 'EZRS', 'TAGS', 'SIRE', 'JOSB', 'SIN', 'COV1', 'COV2', 'CLE-ETH'].map((c) => book(c, 'ethiopian-canon')),
  ...['SAM', 'LXX', 'SAM-GEN', 'PESH', 'VUL'].map((c) => book(c, 'textual-traditions')),
  ...['DID-ETH', 'CLE1', 'HERM'].map((c) => book(c, 'church-writings')),
  ...['4BAR', '2BAR', 'MOS', 'Q246', 'APMO'].map((c) => book(c, 'pseudepigrapha'))
];
const matrix = buildCanonMatrix(LIBRARY);
const status = (code, tradition) => matrix.rows.find((row) => row.code === code).cells[tradition].s;

test('لكل سفر خلية في كل تقليد وبحالة معرّفة وثقة معروفة', () => {
  assert.equal(matrix.rows.length, LIBRARY.length);
  for (const row of matrix.rows) {
    for (const tradition of CANON_TRADITIONS) {
      const cell = row.cells[tradition.slug];
      assert.ok(CANON_STATUSES[cell.s], `${row.code}/${tradition.slug}`);
      assert.ok(['high', 'medium', 'low'].includes(cell.c), `${row.code}/${tradition.slug}`);
    }
  }
});

test('كل تقليد له وصف ومصادر ومجموعة يهودية أو مسيحية', () => {
  assert.equal(CANON_TRADITIONS.filter((t) => t.group === 'jewish').length, 5);
  assert.equal(CANON_TRADITIONS.filter((t) => t.group === 'christian').length, 8);
  for (const tradition of CANON_TRADITIONS) {
    assert.ok(tradition.summary_ar.length > 20, tradition.slug);
    assert.ok(tradition.sources.length >= 1 && tradition.sources.every((s) => s.url.startsWith('https://')), tradition.slug);
  }
});

test('القانون البروتستانتي ٦٦ سفراً بالضبط، ولا تدخل الأسفار القانونية الثانية', () => {
  const accepted = matrix.rows.filter((row) => ['canon', 'canon2'].includes(row.cells.protestant.s) && row.collection_slug !== 'textual-traditions');
  assert.equal(accepted.length, 66);
  assert.equal(status('TOB', 'protestant'), 'not');
});

test('الكاثوليكية: القانونية الثانية قانونية ثانوية، وعزرا الأول والثاني وصلاة منسى ملحق', () => {
  for (const code of ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA', 'ESG', 'DAG']) assert.equal(status(code, 'catholic'), 'canon2', code);
  for (const code of ['1ES', '2ES', 'MAN']) assert.equal(status(code, 'catholic'), 'appendix', code);
  assert.equal(status('3MA', 'catholic'), 'not');
});

test('الأرثوذكسية الخلقيدونية تزيد عن الكاثوليكية بعزرا الأول والمكابيين الثالث وصلاة منسى', () => {
  for (const code of ['1ES', '3MA', 'MAN']) assert.equal(status(code, 'eastern-orthodox'), 'canon2', code);
  assert.equal(status('4MA', 'eastern-orthodox'), 'appendix');
});

test('الأنجليكانية تقرأ الأبوكريفا للعبرة ولا تعدّها قانونية', () => {
  assert.equal(status('TOB', 'anglican'), 'read');
  assert.equal(status('1ES', 'anglican'), 'read');
  assert.equal(status('GEN', 'anglican'), 'canon');
});

test('اليهودية: الحاخامية والقرّائية التناخ فقط، والسامرة التوراة الخمسة فقط', () => {
  for (const code of OT39) {
    assert.equal(status(code, 'rabbinic'), 'canon', code);
    assert.equal(status(code, 'karaite'), 'canon', code);
  }
  for (const code of NT27) assert.equal(status(code, 'rabbinic'), 'not', code);
  assert.deepEqual(OT39.filter((c) => status(c, 'samaritan') === 'canon'), ['GEN', 'EXO', 'LEV', 'NUM', 'DEU']);
  assert.equal(status('JOS', 'samaritan'), 'not');
  assert.equal(status('SAM-GEN', 'samaritan'), 'canon');
});

test('الإثيوبية: أخنوخ واليوبيلات والمكابيون الإثيوبيون قانونية، والمكابيون اليونانيون لا', () => {
  for (const code of ['ENO', 'JUB', '1MCE', '2MCE', '3MCE', 'EZRS', '4BAR']) assert.equal(status(code, 'ethiopian'), 'canon', code);
  for (const code of ['1MA', '2MA', '3MA', '4MA']) assert.equal(status(code, 'ethiopian'), 'not', code);
  for (const code of ['ENO', 'JUB']) {
    for (const slug of ['catholic', 'eastern-orthodox', 'coptic', 'protestant']) assert.equal(status(code, slug), 'not', `${code}/${slug}`);
  }
});

test('السريانية: خمسة أسفار من الجديد خارج البشيطا التقليدية وليست مرفوضة', () => {
  for (const code of ['2PE', '2JN', '3JN', 'JUD', 'REV']) assert.equal(status(code, 'syriac'), 'disputed', code);
  assert.equal(NT27.filter((c) => status(c, 'syriac') === 'canon').length, 22);
});

test('قمران: أستير بلا شاهد وبقية التناخ مشهودة، وأخنوخ واليوبيلات مشهودان', () => {
  assert.equal(status('EST', 'qumran'), 'absent');
  assert.equal(status('ISA', 'qumran'), 'attested');
  assert.equal(status('ENO', 'qumran'), 'attested');
  assert.equal(status('JUB', 'qumran'), 'attested');
  assert.equal(status('GEN', 'qumran'), 'attested');
});

test('الأحكام غير المحسومة أو منخفضة الثقة تحمل ملاحظة صريحة', () => {
  for (const row of matrix.rows) {
    for (const tradition of CANON_TRADITIONS) {
      const cell = row.cells[tradition.slug];
      if (cell.c === 'low' || cell.s === 'unknown' || cell.s === 'disputed') {
        assert.ok(cell.n && cell.n.length > 10, `ملاحظة ناقصة: ${row.code}/${tradition.slug}`);
      }
    }
  }
});

test('الإحصاء يستبعد الشواهد النصية من عدّ الأسفار', () => {
  assert.equal(matrix.stats.total_books, LIBRARY.length);
  assert.equal(matrix.stats.total_works, LIBRARY.length - 5);
  assert.equal(matrix.stats.by_tradition.protestant.accepted, 66);
  assert.equal(matrix.stats.by_tradition.samaritan.accepted, 5);
});

test('الشواهد النصية لكل سفر (السبعينية والفولغاتا والترجوم) شواهد لا أسفار، وقانونية عند معتمدها وحده', () => {
  const extended = buildCanonMatrix([
    book('LXX-GEN', 'textual-traditions'), book('VUL-PSA', 'textual-traditions'), book('ONK-GEN', 'textual-traditions'),
    book('SAM-LEV', 'textual-traditions'), book('PESH', 'textual-traditions')
  ]);
  const cell = (code, slug) => extended.rows.find((r) => r.code === code).cells[slug].s;
  assert.equal(cell('LXX-GEN', 'eastern-orthodox'), 'canon');
  assert.equal(cell('LXX-GEN', 'catholic'), 'witness');
  assert.equal(cell('VUL-PSA', 'catholic'), 'canon');
  assert.equal(cell('VUL-PSA', 'protestant'), 'witness');
  assert.equal(cell('ONK-GEN', 'rabbinic'), 'witness');
  assert.equal(cell('SAM-LEV', 'samaritan'), 'canon');
  assert.equal(cell('PESH', 'syriac'), 'canon');
  assert.equal(extended.stats.total_works, 0);
  assert.equal(extended.stats.total_witnesses, 5);
});

test('المصادر اليهودية مرجعية شفوية أو تراث لا قانون، ولا تدخل عدّ الأسفار', () => {
  const sources = buildCanonMatrix([
    book('MSH-MISHNAH-BERAKHOT', 'jewish-sources'), book('TB-BERAKHOT', 'jewish-sources'),
    book('MDA-BERESHIT-RABBAH', 'jewish-sources'), book('ZOH-ZOHAR', 'jewish-sources'), book('GEN', 'old-testament')
  ]);
  const cell = (code, slug) => sources.rows.find((r) => r.code === code).cells[slug];
  assert.equal(cell('MSH-MISHNAH-BERAKHOT', 'rabbinic').s, 'oral');
  assert.equal(cell('TB-BERAKHOT', 'karaite').s, 'not');
  assert.equal(cell('MDA-BERESHIT-RABBAH', 'rabbinic').s, 'tradition');
  assert.equal(cell('ZOH-ZOHAR', 'rabbinic').s, 'disputed');
  assert.equal(cell('ZOH-ZOHAR', 'rabbinic').c, 'medium');
  assert.equal(cell('TB-BERAKHOT', 'catholic').s, 'not');
  assert.equal(sources.stats.total_works, 1);
  assert.equal(sources.stats.total_jewish_sources, 4);
});

test('تقليد أو حالة مجهولة ترمي خطأ بدل أن تُهمَل', () => {
  assert.throws(() => buildCanonCell('nonexistent', book('GEN')), /تقليد غير معروف/);
});
