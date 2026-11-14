import { readFileSync } from 'node:fs';

// شواهد التوراة غير الماسورية المستوردة من سفاريا. كل ملف بياناته مثبتة ببصمة وعدد وحدات ومواضعها،
// فلا يُقبل نص تغيّر أو نقص بلا تنبيه. المانيفست يُولَّد مع الملفات ولا يُعدَّل يدوياً.
const MANIFEST = JSON.parse(readFileSync(new URL('./data/torah/manifest.json', import.meta.url), 'utf8'));

const BOOKS = [
  { part: 'GEN', title: 'Genesis', nameAr: 'التكوين', chapters: 50 },
  { part: 'EXO', title: 'Exodus', nameAr: 'الخروج', chapters: 40 },
  { part: 'LEV', title: 'Leviticus', nameAr: 'اللاويين', chapters: 27 },
  { part: 'NUM', title: 'Numbers', nameAr: 'العدد', chapters: 36 },
  { part: 'DEU', title: 'Deuteronomy', nameAr: 'التثنية', chapters: 34 }
];

const WITNESSES = [
  {
    key: 'tj-en', prefix: 'TJ', slug: 'en-etheridge-targum-pseudo-jonathan-1862',
    nameAr: 'ترجمة إثريدج الإنجليزية للترجوم المنسوب ليوناثان', nameEn: 'Etheridge English Translation of Targum Pseudo-Jonathan',
    abbreviation: 'TJ-EN', language: 'en', originalLanguage: 'الآرامية', sourceType: 'public-domain-text',
    url: (b) => `https://www.sefaria.org/Targum_Jonathan_on_${b.title}`,
    notes: 'ترجمة جون ويليام إثريدج المنشورة في لندن سنة ١٨٦٢، بحسب سجل سفاريا ملك عام. تُحذف الوحدات التي تحتوي في المصدر علامة اختصار فقط (مثل «_» في العدد ٧)، فتظهر ثغرات في ترقيم بعض الأسفار.'
  },
  {
    key: 'tj', prefix: 'TJ', slug: 'arc-targum-pseudo-jonathan-sefaria',
    nameAr: 'الترجوم المنسوب ليوناثان بالآرامية', nameEn: 'Targum Pseudo-Jonathan (Aramaic)',
    abbreviation: 'TJ-ARC', language: 'arc', originalLanguage: 'الآرامية', sourceType: 'public-domain-text',
    url: (b) => `https://www.sefaria.org/Targum_Jonathan_on_${b.title}`,
    notes: 'النص الآرامي مأخوذ من نسخة سفاريا المسجلة ملكاً عاماً، ومصدرها الأصلي مشروع «توراة إمت». في التكوين ست وحدات فارغة في المصدر لا تُملأ بالتخمين.'
  },
  {
    key: 'onk', prefix: 'ONK', slug: 'arc-targum-onkelos-sefaria',
    nameAr: 'ترجوم أونكلوس بالآرامية', nameEn: 'Targum Onkelos (Aramaic)',
    abbreviation: 'ONK-ARC', language: 'arc', originalLanguage: 'الآرامية', sourceType: 'public-domain-text',
    url: (b) => `https://www.sefaria.org/Onkelos_${b.title}`,
    notes: 'نص ترجوم أونكلوس الآرامي المشكول من نسخة سفاريا المسجلة ملكاً عاماً، ومصدرها الأصلي مشروع «توراة إمت». لا يُعرض على أنه طبعة نقدية.'
  },
  {
    key: 'saadia', prefix: 'SAAD', slug: 'jrb-saadia-tafsir-paris-1893',
    nameAr: 'تفسير سعديا الغاؤون العربي (بالحرف العبري)', nameEn: 'Saadia Gaon Arabic Tafsir of the Torah (Judeo-Arabic)',
    abbreviation: 'SAAD-JRB', language: 'jrb', originalLanguage: 'العربية اليهودية', sourceType: 'public-domain-text',
    url: (b) => `https://www.sefaria.org/Tafsir_Rasag,_${b.title}`,
    notes: 'ترجمة سعديا الغاؤون العربية للتوراة، طبعة باريس ١٨٩٣ كما في سفاريا (ملك عام). النص عربي مكتوب بالحرف العبري، وليس تحويلاً إلى الحرف العربي.'
  }
];

export const TORAH_WITNESS_SOURCES = WITNESSES.flatMap((witness) => BOOKS.map((book) => {
  const file = `${witness.key}-${book.part}.json`;
  const entry = MANIFEST[file];
  if (!entry) throw new Error(`مانيفست شواهد التوراة ينقصه ${file}`);
  const incomplete = entry.skipped > 0;
  return {
    bookCode: `${witness.prefix}-${book.part}`, slug: witness.slug,
    nameAr: witness.nameAr, nameEn: witness.nameEn, abbreviation: witness.abbreviation,
    url: witness.url(book), kind: 'reviewed-unit-text-file',
    textFile: new URL(`./data/torah/${file}`, import.meta.url),
    expectedSha256: entry.sha256, expectedUnitCount: entry.units, expectedUnitLocations: entry.locations,
    expectedWordCount: entry.words, maxChapter: book.chapters, incomplete,
    language: witness.language, originalLanguage: witness.originalLanguage,
    sourceType: witness.sourceType, siteScope: 'bible',
    notes: witness.notes
  };
}));

export const TORAH_WITNESS_BOOKS = [
  { prefix: 'ONK', nameAr: 'ترجوم أونكلوس', nameEn: 'Targum Onkelos', abbr: 'ONK', order: 10, tradition: 'targum', lang: 'الآرامية' },
  { prefix: 'TJ', nameAr: 'الترجوم المنسوب ليوناثان', nameEn: 'Targum Pseudo-Jonathan', abbr: 'TJ', order: 20, tradition: 'targum', lang: 'الآرامية' },
  { prefix: 'SAAD', nameAr: 'تفسير سعديا الغاؤون', nameEn: 'Saadia Gaon Tafsir', abbr: 'SAAD', order: 30, tradition: 'judeo-arabic', lang: 'العربية اليهودية' }
].flatMap((witness) => BOOKS.map((book, index) => ({
  code: `${witness.prefix}-${book.part}`,
  nameAr: `${book.nameAr} في ${witness.nameAr}`,
  nameEn: `${book.title} in ${witness.nameEn}`,
  abbr: `${witness.abbr}-${book.part}`,
  order: witness.order + index / 10,
  chapters: book.chapters,
  tradition: witness.tradition, language: witness.lang
})));
