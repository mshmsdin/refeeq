// أسفار العهد القديم التي تُعرض لها نسخ قديمة موازية (السبعينية بترجمة برنتون، والفولجاتا اللاتينية).
// تُسجَّل برموز مستقلة (LXX-GEN وVUL-GEN ...) لأن ترقيم الإصحاحات والأعداد يختلف عن الماسوري والعربي.
const OT = [
  ['GEN', 'التكوين', 'Genesis', 50], ['EXO', 'الخروج', 'Exodus', 40], ['LEV', 'اللاويين', 'Leviticus', 27],
  ['NUM', 'العدد', 'Numbers', 36], ['DEU', 'التثنية', 'Deuteronomy', 34], ['JOS', 'يشوع', 'Joshua', 24],
  ['JDG', 'القضاة', 'Judges', 21], ['RUT', 'راعوث', 'Ruth', 4], ['1SA', 'صموئيل الأول', '1 Samuel', 31],
  ['2SA', 'صموئيل الثاني', '2 Samuel', 24], ['1KI', 'الملوك الأول', '1 Kings', 22], ['2KI', 'الملوك الثاني', '2 Kings', 25],
  ['1CH', 'أخبار الأيام الأول', '1 Chronicles', 29], ['2CH', 'أخبار الأيام الثاني', '2 Chronicles', 36],
  ['EZR', 'عزرا', 'Ezra', 10], ['NEH', 'نحميا', 'Nehemiah', 13], ['EST', 'أستير', 'Esther', 16],
  ['JOB', 'أيوب', 'Job', 42], ['PSA', 'المزامير', 'Psalms', 151], ['PRO', 'الأمثال', 'Proverbs', 31],
  ['ECC', 'الجامعة', 'Ecclesiastes', 12], ['SNG', 'نشيد الأناشيد', 'Song of Songs', 8], ['ISA', 'إشعياء', 'Isaiah', 66],
  ['JER', 'إرميا', 'Jeremiah', 52], ['LAM', 'مراثي إرميا', 'Lamentations', 5], ['EZK', 'حزقيال', 'Ezekiel', 48],
  ['DAN', 'دانيال', 'Daniel', 14], ['HOS', 'هوشع', 'Hosea', 14], ['JOL', 'يوئيل', 'Joel', 4], ['AMO', 'عاموس', 'Amos', 9],
  ['OBA', 'عوبديا', 'Obadiah', 1], ['JON', 'يونان', 'Jonah', 4], ['MIC', 'ميخا', 'Micah', 7], ['NAM', 'ناحوم', 'Nahum', 3],
  ['HAB', 'حبقوق', 'Habakkuk', 3], ['ZEP', 'صفنيا', 'Zephaniah', 3], ['HAG', 'حجي', 'Haggai', 2],
  ['ZEC', 'زكريا', 'Zechariah', 14], ['MAL', 'ملاخي', 'Malachi', 4]
];

export const ANCIENT_VERSIONS = [
  { prefix: 'LXX', nameAr: 'السبعينية', nameEn: 'Septuagint (Brenton)', tradition: 'lxx', language: 'الإنجليزية عن اليونانية', order: 100, skip: ['EST', 'DAN'] },
  { prefix: 'VUL', nameAr: 'الفولجاتا', nameEn: 'Clementine Vulgate', tradition: 'vulgate', language: 'اللاتينية', order: 200, skip: [] }
];

export const ANCIENT_VERSION_BOOKS = ANCIENT_VERSIONS.flatMap((version) => OT
  .filter(([code]) => !version.skip.includes(code))
  .map(([code, nameAr, nameEn, chapters], index) => ({
    code: `${version.prefix}-${code}`, baseCode: code, prefix: version.prefix,
    nameAr: `${nameAr} في ${version.nameAr}`, nameEn: `${nameEn} in ${version.nameEn}`,
    abbr: `${version.prefix}-${code}`, order: version.order + index / 100, chapters,
    tradition: version.tradition, language: version.language
  })));
