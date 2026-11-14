// مصادر الكتب الممسوحة على أرشيف الإنترنت. النص وإحداثيات الكلمات يُحفظان عندنا، والصور تُجلب من أرشيف الإنترنت.
const SHEHADEH_FILE = 'الترجمة العربية للتوراة السامريين - حسيب شحادة';

export const SCAN_BOOK_SOURCES = [
  {
    slug: 'sam-ar-shehadeh',
    titleAr: 'الترجمة العربية للتوراة السامريين',
    titleEn: 'The Arabic Translation of the Samaritan Pentateuch',
    editorAr: 'حسيب شحادة',
    textualTradition: 'sam',
    archiveIdentifier: 'ail_20190326',
    archiveUrl: 'https://archive.org/details/ail_20190326',
    // اسم الملف داخل عنصر أرشيف الإنترنت (بلا امتداد).
    archiveFileBase: SHEHADEH_FILE,
    expectedPageCount: 1123,
    expectedMinWords: 300000,
    notes: 'طبعة نقدية للترجمة العربية السامرية: النص في أعلى الصفحة وجدول فروق المخطوطات تحته. القراءة الآلية من أرشيف الإنترنت قد تخطئ في بعض الكلمات، والصورة هي المرجع.',
    // أسماء الأسفار في رأس الصفحة (سفر ...) بما فيها أخطاء القراءة الآلية المعروفة في «تثنية».
    sectionHeads: {
      التكوين: { code: 'GEN', nameAr: 'التكوين' },
      الخروج: { code: 'EXO', nameAr: 'الخروج' },
      اللاويين: { code: 'LEV', nameAr: 'اللاويين' },
      العدد: { code: 'NUM', nameAr: 'العدد' },
      تثنية: { code: 'DEU', nameAr: 'التثنية' },
      نثنية: { code: 'DEU', nameAr: 'التثنية' },
      تنثنية: { code: 'DEU', nameAr: 'التثنية' },
      تثلية: { code: 'DEU', nameAr: 'التثنية' },
      تثئية: { code: 'DEU', nameAr: 'التثنية' }
    }
  }
];

export function djvuXmlUrl(source) {
  return `https://archive.org/download/${source.archiveIdentifier}/${encodeURIComponent(`${source.archiveFileBase}_djvu.xml`)}`;
}

// قالب رابط الصورة (IIIF) لأي ورقة: يُستبدل {leaf} برقم الورقة بأربع خانات و{width} بالعرض المطلوب.
export function imageUrlTemplate(source) {
  const base = source.archiveFileBase;
  const path = `${source.archiveIdentifier}/${base}_jp2.zip/${base}_jp2/${base}_{leaf}.jp2`;
  const encoded = encodeURIComponent(path).replace('%7Bleaf%7D', '{leaf}');
  return `https://iiif.archive.org/image/iiif/3/${encoded}/full/{width},/0/default.jpg`;
}
