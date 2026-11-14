import { readFileSync, existsSync } from 'node:fs';

// فهرس المصادر اليهودية الأصول (المشنا والتلمودان والكابالا والمدراشيم) المستوردة من سفاريا.
// المانيفست يُولَّد مع ملفات البيانات ولا يُعدَّل يدوياً (انظر server/scripts/build_jewish_sources.py إن وُجد).
const MANIFEST_URL = new URL('./data/jewish/manifest.json', import.meta.url);

export const JEWISH_SOURCES_MANIFEST = existsSync(MANIFEST_URL)
  ? JSON.parse(readFileSync(MANIFEST_URL, 'utf8'))
  : { works: [], translations: {} };

export const JEWISH_SOURCE_GROUPS = [
  { key: 'mishnah', prefix: 'MSH', nameAr: 'المشنا', order: 1 },
  { key: 'bavli', prefix: 'TB', nameAr: 'التلمود البابلي', order: 2 },
  { key: 'yerushalmi', prefix: 'TY', nameAr: 'التلمود الأورشليمي', order: 3 },
  { key: 'zohar', prefix: 'ZOH', nameAr: 'الزوهر', order: 4 },
  { key: 'yetzirah', prefix: 'YTZ', nameAr: 'سفر يتسيراه', order: 5 },
  { key: 'kabbalah_other', prefix: 'KAB', nameAr: 'الكابالا', order: 6 },
  { key: 'arizal', prefix: 'ARI', nameAr: 'كتابات الأري والكابالا اللورانية', order: 7 },
  { key: 'midrash_halakhah', prefix: 'MDH', nameAr: 'المدراش الفقهي', order: 8 },
  { key: 'midrash_aggadah', prefix: 'MDA', nameAr: 'المدراش القصصي (أجادا)', order: 9 }
];

// سجلات الفهرسة لقاعدة البيانات: [code, nameAr, nameEn, abbr, order, chapters, group]
export const JEWISH_SOURCE_BOOKS = JEWISH_SOURCES_MANIFEST.works.map((work, index) => ({
  code: work.code, nameAr: work.nameAr, nameEn: work.nameEn, abbr: work.code,
  order: 1 + index / 1000, chapters: work.chapters, group: work.group, textStatus: work.textStatus
}));
