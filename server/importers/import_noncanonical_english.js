/**
 * استيراد نصوص إنجليزية كاملة من طبعات قديمة معلنة الملكية العامة.
 * تُحفظ النصوص بوحدة واحدة لكل إصحاح لأن هذه الأعمال لا تملك تقسيماً موحداً
 * إلى أعداد في المصادر المختارة.
 */

import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const SOURCES = [
  {
    bookCode: 'ENO',
    slug: 'en-charles-enoch',
    nameAr: 'ترجمة تشارلز الإنجليزية لسفر أخنوخ الأول',
    nameEn: 'R. H. Charles English 1 Enoch',
    abbreviation: 'ENO-EN',
    url: 'https://enocharchive.com/books/the-book-of-enoch/{chapter}',
    kind: 'structured-html',
    maxChapter: 108,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز، طبعة 1917، من نسخة منظمة تنقل النص الإنجليزي المعلن ملكيته العامة.'
  },
  {
    bookCode: 'JUB',
    slug: 'en-charles-jubilees',
    nameAr: 'ترجمة تشارلز الإنجليزية لسفر اليوبيلات',
    nameEn: 'R. H. Charles English Jubilees',
    abbreviation: 'JUB-EN',
    url: 'https://enocharchive.com/books/the-book-of-jubilees/{chapter}',
    kind: 'structured-html',
    maxChapter: 50,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز، طبعة 1902، من نسخة منظمة تنقل النص الإنجليزي المعلن ملكيته العامة.'
  },
  {
    bookCode: 'DIDAS',
    slug: 'en-gibson-didascalia',
    nameAr: 'الترجمة الإنجليزية لغيبسون للدسقولية الرسولية',
    nameEn: 'Margaret Dunlop Gibson English Didascalia',
    abbreviation: 'DID-EN',
    url: 'https://archive.org/download/didascaliaaposto00gibsuoft/didascaliaaposto00gibsuoft_djvu.txt',
    anchor: '\nCHAPTER   I.',
    maxChapter: 26,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة مارغريت دنلوب غيبسون من السريانية، طبعة 1903، من نسخة أرشيفية معلنة الملكية العامة.'
  },
  {
    bookCode: '1MCE',
    slug: 'en-wikisource-1-meqabyan',
    nameAr: 'الترجمة الإنجليزية للمكابيان الإثيوبي الأول',
    nameEn: 'Wikisource English 1 Meqabyan',
    abbreviation: '1MCE-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=Translation%3A1_Meqabyan&prop=wikitext&format=json&origin=*',
    kind: 'wikisource-api',
    maxChapter: 7,
    language: 'en',
    originalLanguage: 'الجعزية',
    sourceType: 'community-translation',
    notes: 'ترجمة إنجليزية مجتمعية منشورة في ويكي مصدر عن أصل جعزي، بترخيص المشاع الإبداعي نسب المصنف-المشاركة بالمثل 4.0؛ ليست طبعة نقدية معيارية.'
  },
  {
    bookCode: '2MCE',
    slug: 'en-wikisource-2-meqabyan',
    nameAr: 'الترجمة الإنجليزية للمكابيان الإثيوبي الثاني',
    nameEn: 'Wikisource English 2 Meqabyan',
    abbreviation: '2MCE-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=Translation%3A2_Meqabyan&prop=wikitext&format=json&origin=*',
    kind: 'wikisource-api',
    maxChapter: 21,
    language: 'en',
    originalLanguage: 'الجعزية',
    sourceType: 'community-translation',
    notes: 'ترجمة إنجليزية مجتمعية منشورة في ويكي مصدر عن أصل جعزي، بترخيص المشاع الإبداعي نسب المصنف-المشاركة بالمثل 4.0؛ ليست طبعة نقدية معيارية.'
  },
  {
    bookCode: '3MCE',
    slug: 'en-wikisource-3-meqabyan',
    nameAr: 'الترجمة الإنجليزية للمكابيان الإثيوبي الثالث',
    nameEn: 'Wikisource English 3 Meqabyan',
    abbreviation: '3MCE-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=Translation%3A3_Meqabyan&prop=wikitext&format=json&origin=*',
    kind: 'wikisource-api',
    maxChapter: 10,
    language: 'en',
    originalLanguage: 'الجعزية',
    sourceType: 'community-translation',
    notes: 'ترجمة إنجليزية مجتمعية منشورة في ويكي مصدر عن أصل جعزي، بترخيص المشاع الإبداعي نسب المصنف-المشاركة بالمثل 4.0؛ ليست طبعة نقدية معيارية.'
  },
  {
    bookCode: 'ENO2',
    slug: 'en-platt-2-enoch',
    nameAr: 'الترجمة الإنجليزية لأخنوخ الثاني',
    nameEn: 'Rutherford H. Platt English 2 Enoch',
    abbreviation: 'ENO2-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=The_Forgotten_Books_of_Eden%2FThe_Book_of_the_Secrets_of_Enoch&prop=wikitext&format=json&origin=*',
    kind: 'wikisource-book-api',
    maxChapter: 68,
    language: 'en',
    originalLanguage: 'السلافية الكنسية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة روذرفورد بلات الإنجليزية المنشورة في كتاب The Forgotten Books of Eden سنة 1928؛ تُعرض بوصفها ترجمة تاريخية، مع التنبيه إلى اختلاف تقسيمات أخنوخ الثاني بين المخطوطات والمراجعات.'
  },
  {
    bookCode: 'PSOL',
    slug: 'en-platt-psalms-solomon',
    nameAr: 'الترجمة الإنجليزية لمزامير سليمان',
    nameEn: 'Rutherford H. Platt English Psalms of Solomon',
    abbreviation: 'PSOL-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=The_Forgotten_Books_of_Eden%2FThe_Psalms_of_Solomon&prop=wikitext&format=json&origin=*',
    kind: 'wikisource-book-api',
    maxChapter: 18,
    language: 'en',
    originalLanguage: 'اليونانية مع شواهد سريانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة إنجليزية تاريخية لمجموعة مزامير سليمان، 18 مزموراً؛ تُعرض كعمل يهودي منحول مستقل، لا كسفر قانوني ولا كجزء من المزامير الكتابية.'
  },
  {
    bookCode: 'ASC',
    slug: 'en-charles-ascension-isaiah',
    nameAr: 'الترجمة الإنجليزية لصعود إشعياء',
    nameEn: 'R. H. Charles English Ascension of Isaiah',
    abbreviation: 'ASC-EN',
    url: 'https://viachrista.org/Library/Anon_Ascension_Isaiah.html',
    kind: 'viachrista-html',
    maxChapter: 11,
    language: 'en',
    originalLanguage: 'الجعزية مع شواهد أقدم',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز من النص الإثيوبي مع الشواهد الأقدم، في 11 إصحاحاً؛ العمل مركب من استشهاد إشعياء ورؤيا لاحقة، لذلك لا يعرض كنص موحد بلا وصف.'
  },
  {
    bookCode: 'T12',
    slug: 'en-wikisource-twelve-patriarchs',
    nameAr: 'الترجمة الإنجليزية لوصايا الآباء الاثني عشر',
    nameEn: 'Wikisource English Testaments of the Twelve Patriarchs',
    abbreviation: 'T12-EN',
    url: 'https://en.wikisource.org/wiki/Ante-Nicene_Fathers/Volume_VIII/The_Testaments_of_the_Twelve_Patriarchs',
    kind: 'wikisource-collection',
    maxChapter: 12,
    language: 'en',
    originalLanguage: 'اليونانية مع شواهد عبرية وأرمينية وسلافية',
    sourceType: 'community-translation',
    notes: 'نص إنجليزي من مجموعة آباء ما قبل نيقية المنشورة في ويكي مصدر، مقسم إلى وصية مستقلة لكل واحد من الآباء الاثني عشر. يحفظ المصدر ترقيم الفقرات، ولا توجد ترجمة عربية مدخلة في هذه المرحلة.',
    pages: [
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Reuben Concerning Thoughts',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Simeon Concerning Envy',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Levi Concerning the Priesthood and Arrogance',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Judah Concerning Fortitude, and Love of Money, and Fornication',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Issachar Concerning Simplicity',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Zebulun Concerning Compassion and Mercy',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Dan Concerning Anger and Lying',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Naphtali Concerning Natural Goodness',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Gad Concerning Hatred',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Asher Concerning Two Faces of Vice and Virtue',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Joseph Concerning Sobriety',
      'Ante-Nicene Fathers/Volume VIII/The Testaments of the Twelve Patriarchs/The Testament of Benjamin Concerning a Pure Mind'
    ]
  },
  {
    bookCode: '2BAR',
    slug: 'en-charles-2-baruch',
    nameAr: 'الترجمة الإنجليزية لباروخ الثاني',
    nameEn: 'R. H. Charles English 2 Baruch',
    abbreviation: '2BAR-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/2Baruch.html',
    kind: 'pseudepigrapha-html',
    maxChapter: 85,
    language: 'en',
    originalLanguage: 'السريانية مع شواهد يونانية وآرامية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز المنشورة في مجموعة المنحولات والأبوكريفا سنة 1913، من نسخة منظمة تحفظ ترقيم الإصحاحات والفقرات كما يظهر في المصدر. لا توجد ترجمة عربية مدخلة في هذه المرحلة، وتُترك للمقارنة والترجمة اللاحقة.'
  },
  {
    bookCode: '3BAR',
    slug: 'en-wesley-center-3-baruch',
    nameAr: 'الترجمة الإنجليزية لباروخ الثالث',
    nameEn: 'Wesley Center English 3 Baruch',
    abbreviation: '3BAR-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/3Baruch.html',
    kind: 'pseudepigrapha-chapter-html',
    maxChapter: 17,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'web-edition',
    notes: 'ترجمة إنجليزية تاريخية للرؤيا اليونانية لباروخ الثالث في تحرير مركز ويسلي، من نص منظم يحفظ الفصول السبعة عشر. يحفظ المستورد وحدة نصية واحدة لكل فصل لأن المصدر يجمع أرقام الآيات داخل فقرات متصلة. يذكر المصدر قيداً تجارياً على النص، ولا توجد ترجمة عربية مدخلة في هذه المرحلة.'
  },
  {
    bookCode: 'ENO3',
    slug: 'en-odeberg-3-enoch',
    nameAr: 'الترجمة الإنجليزية لأخنوخ الثالث',
    nameEn: 'Hugo Odeberg English 3 Enoch',
    abbreviation: 'ENO3-EN',
    url: 'https://www.thebookofenoch.net/3-enoch/',
    kind: 'enoch3-collection',
    maxChapter: 54,
    language: 'en',
    originalLanguage: 'العبرية',
    sourceType: 'web-edition',
    notes: 'طبعة ويب إنجليزية مبنية على تحرير هوغو أودبرغ لأخنوخ الثالث سنة 1928، وتعرض 54 قسماً مرقماً بما فيها الأقسام الحرفية 15B و22B و22C و48A–48D. تُحفظ فقرات كل قسم كوحدات مستقلة، ولا توجد ترجمة عربية مدخلة في هذه المرحلة.',
    pages: [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '15B',
      '16', '17', '18', '19', '20', '21', '22', '22B', '22C', '23', '24', '25', '26', '27', '28',
      '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44',
      '45', '46', '47', '48A', '48B', '48C', '48D'
    ]
  },
  {
    bookCode: 'ABR',
    slug: 'en-pseudepigrapha-apocalypse-abraham',
    nameAr: 'الترجمة الإنجليزية لرؤيا إبراهيم',
    nameEn: 'English Apocalypse of Abraham',
    abbreviation: 'ABR-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/Apocalypse_of_Abraham.html',
    kind: 'pseudepigrapha-two-column-html',
    maxChapter: 32,
    language: 'en',
    originalLanguage: 'السلافية الكنسية',
    sourceType: 'web-edition',
    notes: 'طبعة ويب تعرض ترجمتين إنجليزيتين مجهولتي المترجم؛ أُدخل العمود الأول وحده في ٣٢ إصحاحاً و٣٠٢ وحدة، مع إبقاء النص منفصلاً عن أي ترجمة عربية لاحقة.'
  },
  {
    bookCode: 'AABR',
    slug: 'en-craigie-testament-abraham-version-1',
    nameAr: 'الترجمة الإنجليزية لوصية إبراهيم، النسخة الأولى',
    nameEn: 'W. A. Craigie English Testament of Abraham, Version 1',
    abbreviation: 'AABR-V1-EN',
    url: 'https://www.newadvent.org/fathers/1007.htm',
    kind: 'new-advent-version-html',
    version: 1,
    maxChapter: 20,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة دبليو. أ. كريغي المنشورة في آباء ما قبل نيقية، وتعرض النسخة الأولى من وصية إبراهيم في ٢٠ مقطعاً مرقماً؛ يحفظها المستورد مستقلة عن النسخة الثانية.'
  },
  {
    bookCode: 'AABR',
    slug: 'en-craigie-testament-abraham-version-2',
    nameAr: 'الترجمة الإنجليزية لوصية إبراهيم، النسخة الثانية',
    nameEn: 'W. A. Craigie English Testament of Abraham, Version 2',
    abbreviation: 'AABR-V2-EN',
    url: 'https://www.newadvent.org/fathers/1007.htm',
    kind: 'new-advent-version-html',
    version: 2,
    maxChapter: 15,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة دبليو. أ. كريغي المنشورة في آباء ما قبل نيقية، وتعرض النسخة الثانية من وصية إبراهيم في ١٤ مقطعاً مرقماً؛ تحفظ منفصلة لأن النسختين تختلفان في الطول والترتيب.'
  },
  {
    bookCode: 'ENO',
    slug: 'gez-dillmann-enoch',
    nameAr: 'النص الجعزي لأخنوخ الأول',
    nameEn: 'August Dillmann Digital Ethiopic 1 Enoch',
    abbreviation: 'ENO-GEZ',
    url: 'https://www.tau.ac.il/~hacohen/Henoch/Henoch%201.html',
    kind: 'tau-ethiopic-html',
    maxChapter: 108,
    language: 'gez',
    originalLanguage: 'الجعزية',
    sourceType: 'critical-ethiopic',
    notes: 'نسخة رقمية من طبعة أغسطس دِلمن الجعزية المنشورة في 1851، بصفحة مستقلة لكل إصحاح حتى الإصحاح 108؛ تحفظ هذه النسخة وحدة نصية واحدة لكل إصحاح لأن صفحات المصدر لا تقدم تقسيماً عددياً موحداً.'
  },
  {
    bookCode: 'MOS',
    slug: 'en-charles-assumption-moses',
    nameAr: 'الترجمة الإنجليزية لصعود موسى / وصية موسى',
    nameEn: 'R. H. Charles English Assumption of Moses',
    abbreviation: 'MOS-EN',
    url: 'https://www.sacredthings.org/docs/assumption-1/',
    kind: 'sacredthings-html',
    maxChapter: 12,
    language: 'en',
    originalLanguage: 'اللاتينية مع إعادة بناء نقدية',
    sourceType: 'html',
    notes: 'نص إنجليزي منسوب إلى طبعة آر. هـ. تشارلز، مع التنبيه إلى أن المخطوط الباقي ناقص وأن الاسم الأكاديمي الشائع هو وصية موسى.'
  },
  {
    bookCode: 'MOS',
    slug: 'la-ocp-assumption-moses',
    nameAr: 'الشاهد اللاتيني لصعود موسى',
    nameEn: 'OCP Latin Assumption of Moses',
    abbreviation: 'MOS-LA',
    url: 'https://raw.githubusercontent.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/master/static/docs/Mois.xml',
    kind: 'ocp-xml',
    maxChapter: 12,
    language: 'la',
    originalLanguage: 'اللاتينية',
    sourceType: 'tei-xml',
    notes: 'الشاهد اللاتيني الإلكتروني من Online Critical Pseudepigrapha، مع حفظ التقسيم الإصحاحي والعددي للشاهد.'
  }
];

function romanToNumber(value) {
  const digits = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = digits[value[index]];
    const next = digits[value[index + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total;
}

async function fetchText(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json,text/html,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': 'Rafeeq-Bible-Importer/1.0 (https://wiki.din.hk/bible/)'
      }
    });
    if (response.ok) return response.text();
    if (response.status !== 429 || attempt === 3) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter, 20)
      : 3 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
  throw new Error(`تعذر جلب المصدر ${url}`);
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[Illustration[^\]]*\]/gi, '')
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&emsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)));
}

function cleanHtmlVerse(html) {
  return cleanText(decodeHtml(html
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<span[^>]*class="[^"]*dropcap-fallback[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span[^>]*class="[^"]*verse-link-icon[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<sup[^>]*class="[^"]*verse-number[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, ' ')));
}

async function parseStructuredHtmlChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const html = await fetchText(source.url.replace('{chapter}', String(chapter)));
    const container = html.match(/<div class="chapter-text">([\s\S]*?)<\/div>/i)?.[1];
    if (!container) throw new Error(`لم يُعثر على نص الإصحاح ${chapter} في ${source.slug}`);
    const verses = [...container.matchAll(/<p[^>]*class="[^"]*\bverse\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match, index) => {
        const verse = Number(match[1].match(/<sup[^>]*class="[^"]*verse-number[^"]*"[^>]*>\s*(\d+)\s*<\/sup>/i)?.[1] || index + 1);
        return { chapter, verse, text: cleanHtmlVerse(match[1]) };
      })
      .filter((row) => row.text.length > 10);
    if (!verses.length) throw new Error(`لم تُكتشف أعداد الإصحاح ${chapter} في ${source.slug}`);
    chapters.push(...verses);
  }
  return chapters;
}

function stripHtml(html) {
  return cleanText(decodeHtml(html.replace(/<[^>]+>/g, ' ')));
}

function stripWikisourceMarkup(text) {
  return cleanText(decodeHtml(text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,5}/g, '')));
}

function wikisourceApiUrl(page) {
  return `https://en.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`;
}

function parseWikisourceCollectionPage(content, source, chapter, page) {
  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error(`استجابة ويكي مصدر ليست بصيغة JSON في ${source.slug}، القسم ${chapter}`);
  }
  const raw = payload?.parse?.wikitext?.['*'];
  if (!raw) throw new Error(`لم يُعثر على النص في ${source.slug}، القسم ${chapter}`);
  const body = raw
    .replace(/^.*?Concerning [\s\S]*?\n\s*/i, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, ' ');
  const rows = [...body.matchAll(/(?:^|\n)\s*(\d+)\.(?:\s|&#160;|&nbsp;)+([\s\S]*?)(?=\n\s*\d+\.(?:\s|&#160;|&nbsp;)+|$)/g)]
    .map((match) => ({
      chapter,
      verse: Number(match[1]),
      text: stripWikisourceMarkup(match[2]),
      sourceUrl: wikisourceApiUrl(page)
    }))
    .filter((row) => row.text.length > 10);
  if (!rows.length) throw new Error(`لم تُكتشف فقرات القسم ${chapter} في ${source.slug}`);
  return rows;
}

async function parseWikisourceCollectionChapters(source) {
  const chapters = [];
  for (const [index, page] of source.pages.entries()) {
    const content = await fetchText(wikisourceApiUrl(page));
    chapters.push(...parseWikisourceCollectionPage(content, source, index + 1, page));
  }
  return chapters;
}

function stripPseudepigraphaHtml(html) {
  return cleanText(decodeHtml(html
    .replace(/<font[^>]*>\s*finish\s*<\/font>[\s\S]*$/i, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
}

function parsePseudepigraphaChapters(content, source) {
  const chapterMatches = [...content.matchAll(/<a\s+id="C(\d+)"[^>]*>\s*<font[^>]*>\s*Chapter\s+\1\s*<\/font>\s*<\/a>/gi)];
  if (!chapterMatches.length) throw new Error(`لم تُكتشف عناوين الإصحاحات في ${source.slug}`);

  const chapters = [];
  for (const [chapterIndex, chapterMatch] of chapterMatches.entries()) {
    const chapter = Number(chapterMatch[1]);
    const chapterEnd = chapterMatches[chapterIndex + 1]?.index ?? content.length;
    const body = content.slice(chapterMatch.index, chapterEnd);
    const versePattern = new RegExp(`<a\\s+id="C${chapter}\\.(\\d+)"[^>]*>\\s*<font[^>]*>[\\s\\S]*?<\\/font>\\s*<\\/a>`, 'gi');
    const verseMatches = [...body.matchAll(versePattern)];
    for (const [verseIndex, verseMatch] of verseMatches.entries()) {
      const verse = Number(verseMatch[1]);
      const verseEnd = verseMatches[verseIndex + 1]?.index ?? body.length;
      const text = stripPseudepigraphaHtml(body.slice(verseMatch.index + verseMatch[0].length, verseEnd));
      if (text.length > 10) chapters.push({ chapter, verse, text, sourceUrl: source.url });
    }
  }
  if (!chapters.length) throw new Error(`لم تُكتشف فقرات في ${source.slug}`);
  return chapters;
}

function parsePseudepigraphaChapterHtml(content, source) {
  const headingMatches = [...content.matchAll(/<span[^>]*color:\s*red[^>]*>[\s\S]*?<\/span>/gi)];
  if (headingMatches.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headingMatches.length} فصلاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }

  return headingMatches.map((heading, index) => {
    const end = headingMatches[index + 1]?.index ?? content.length;
    const rawText = content.slice(heading.index, end)
      .replace(/^\s*<span[^>]*color:\s*red[^>]*>[\s\S]*?<\/span>/i, '')
      .replace(/\s+The (?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth) Heaven\.\s*$/i, '')
      .replace(/\s+Edited by Wesley Caspers[\s\S]*$/i, '');
    const text = cleanText(decodeHtml(rawText
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')));
    const chapter = index + 1;
    if (text.length < 40) throw new Error(`لم يُكتشف نص الفصل ${chapter} في ${source.slug}`);
    return { chapter, verse: 1, text, sourceUrl: source.url };
  });
}

function stripEnoch3Html(html) {
  return cleanText(decodeHtml(html
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
}

function parsePseudepigraphaTwoColumnChapters(content, source) {
  const chapters = [];
  let chapter = 0;
  for (const rowMatch of content.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cell = rowMatch[1].match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '';
    const chapterMatch = cell.match(/T1_C(\d+)"[^>]*>Chapter/i);
    if (chapterMatch) {
      chapter = Number(chapterMatch[1]);
      continue;
    }
    const verseMatch = cell.match(/T1_C\d+_V(\d+)/i);
    if (!verseMatch || chapter < 1) continue;
    const anchorEnd = cell.indexOf('</A>', verseMatch.index) + 4;
    const text = stripHtml(cell.slice(anchorEnd));
    if (text.length > 2) chapters.push({
      chapter,
      verse: Number(verseMatch[1]),
      text,
      sourceUrl: source.url
    });
  }
  const chaptersSeen = new Set(chapters.map((row) => row.chapter));
  if (chaptersSeen.size !== source.maxChapter) {
    throw new Error(`اكتُشف ${chaptersSeen.size} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return chapters;
}

function parseNewAdventVersionChapters(content, source) {
  const versionLabel = `Version ${source.version}`;
  const nextLabel = source.version === 1 ? 'Version 2' : 'About this page';
  const section = content.match(new RegExp(`<h[1-6][^>]*>\\s*${versionLabel}\\s*<\\/h[1-6]>([\\s\\S]*?)<h[1-6][^>]*>\\s*${nextLabel}\\s*<\\/h[1-6]>`, 'i'))?.[1];
  if (!section) throw new Error(`لم يُعثر على ${versionLabel} في ${source.slug}`);
  const rows = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .map((text) => text.match(/^(\d+)\.\s+([\s\S]+)$/))
    .filter(Boolean)
    .map((match, index) => ({
      chapter: index + 1,
      verse: 1,
      text: match[2],
      sourceUrl: source.url
    }))
    .filter((row) => row.text.length > 10);
  if (rows.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${rows.length} مقاطع فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return rows;
}

async function parseEnoch3Chapters(source) {
  const chapters = [];
  for (const [index, label] of source.pages.entries()) {
    const url = `${source.url}chapter-${label.toLowerCase()}/`;
    const content = await fetchText(url);
    const article = content.match(/<article[^>]*class="[^"]*verses[^"]*"[^>]*>([\s\S]*?)<section[^>]*class="[^"]*source[^"]*"/i)?.[1];
    if (!article) throw new Error(`لم يُعثر على قسم القراءة في ${source.slug}، القسم ${label}`);
    const rows = [...article.matchAll(/<p\s+id="verse-[^"]+"[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match, verseIndex) => ({
        chapter: index + 1,
        verse: verseIndex + 1,
        text: stripEnoch3Html(match[1]),
        sourceUrl: url
      }))
      .filter((row) => row.text.length > 10);
    if (!rows.length) throw new Error(`لم تُكتشف فقرات القسم ${label} في ${source.slug}`);
    chapters.push(...rows);
  }
  return chapters;
}

function parseWikisourceChapters(content, source) {
  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error(`استجابة ويكي مصدر ليست بصيغة JSON في ${source.slug}`);
  }
  const raw = payload?.parse?.wikitext?.['*'];
  if (!raw) throw new Error(`لم يُعثر على النص في استجابة ويكي مصدر لـ ${source.slug}`);

  const headingPattern = /^\s*={0,3}\s*Chapter\s+(\d+)\s*={0,3}\s*$/gim;
  const headings = [...raw.matchAll(headingPattern)].map((match) => ({
    chapter: Number(match[1]),
    end: match.index,
    start: match.index + match[0].length
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }

  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.end ?? raw.length;
    const body = raw.slice(heading.start, end);
    const blocks = body.split(/\n\s*\n/).map(stripWikisourceMarkup).filter(Boolean);
    const rows = [];
    let preface = '';
    for (const block of blocks) {
      const verseMatch = block.match(/^\s*(?:\[(\d+)\]|(\d+)\.?)\s+([\s\S]+)$/);
      if (!verseMatch) {
        if (!rows.length) preface = [preface, block].filter(Boolean).join(' ');
        else rows[rows.length - 1].text = `${rows[rows.length - 1].text} ${block}`;
        continue;
      }
      const verse = Number(verseMatch[1] || verseMatch[2]);
      const text = [preface, verseMatch[3]].filter(Boolean).join(' ');
      rows.push({ chapter: heading.chapter, verse, text, sourceUrl: source.url });
      preface = '';
    }
    if (!rows.length) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    chapters.push(...rows.filter((row) => row.text.length > 10));
  }
  return chapters;
}

function parseWikisourceBookChapters(content, source) {
  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error(`استجابة ويكي مصدر ليست بصيغة JSON في ${source.slug}`);
  }
  const raw = payload?.parse?.wikitext?.['*'];
  if (!raw) throw new Error(`لم يُعثر على النص في استجابة ويكي مصدر لـ ${source.slug}`);

  const headingPattern = /^\s*=+\s*Chapter\s+(\d+)\s*=+\s*$/gim;
  const headings = [...raw.matchAll(headingPattern)].map((match) => ({
    chapter: Number(match[1]),
    end: match.index,
    start: match.index + match[0].length
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }

  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.end ?? raw.length;
    const body = raw.slice(heading.start, end);
    const rows = [];
    let preface = '';
    for (const rawLine of body.split(/\r?\n/)) {
      const colonPrefix = rawLine.match(/^\s*(:+)/)?.[1] || '';
      const cleaned = stripWikisourceMarkup(rawLine.replace(/^\s*:+\s*/, ''));
      if (!cleaned || /^\{\{|^={2,}|^''/.test(rawLine.trim())) continue;
      if (/^(?:Category:|The Forgotten Books of Eden|Top\s|Note:)/i.test(cleaned)) break;
      const verseMatch = cleaned.match(/^\s*(\d+)\.?\s+([\s\S]+)$/);
      if (!verseMatch) {
        if (colonPrefix.length >= 2 && rows.length) rows[rows.length - 1].text = `${rows[rows.length - 1].text} ${cleaned}`;
        else if (colonPrefix.length === 1) rows.push({ chapter: heading.chapter, verse: rows.length + 1, text: cleaned, sourceUrl: source.url });
        else if (!rows.length) preface = [preface, cleaned].filter(Boolean).join(' ');
        else rows[rows.length - 1].text = `${rows[rows.length - 1].text} ${cleaned}`;
        continue;
      }
      const verse = Number(verseMatch[1]);
      const text = [preface, verseMatch[2]].filter(Boolean).join(' ');
      rows.push({ chapter: heading.chapter, verse, text, sourceUrl: source.url });
      preface = '';
    }
    if (!rows.length) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    chapters.push(...rows.filter((row) => row.text.length > 10));
  }
  return chapters;
}

function parseViaChristaChapters(content, source) {
  const headingPattern = /<p>\s*<b>Chapter\s+(\d+)<\/b>/gi;
  const headings = [...content.matchAll(headingPattern)].map((match) => ({
    chapter: Number(match[1]),
    end: match.index,
    start: match.index + match[0].length
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }

  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.end ?? content.length;
    const body = content.slice(heading.start, end)
      .replace(/<hr\b[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n');
    const rows = [];
    const hasVerseOne = /\b1\.?\s+/.test(body);
    let preface = '';
    for (const rawLine of body.split(/\r?\n/)) {
      const cleaned = cleanText(decodeHtml(rawLine.replace(/<[^>]+>/g, ' ')));
      if (!cleaned || /^R\. H\. Charles, Translator$/i.test(cleaned)) continue;
      if (/(?:Top\s|Note:|Copyright)/i.test(cleaned)) break;
      const verseMatch = cleaned.match(/^\s*(\d+)\.?\s+([\s\S]+)$/);
      if (verseMatch) {
        rows.push({
          chapter: heading.chapter,
          verse: Number(verseMatch[1]),
          text: [preface, verseMatch[2]].filter(Boolean).join(' '),
          sourceUrl: source.url
        });
        preface = '';
      } else if (!rows.length) {
        if (hasVerseOne) preface = [preface, cleaned].filter(Boolean).join(' ');
        else rows.push({ chapter: heading.chapter, verse: 1, text: cleaned, sourceUrl: source.url });
      } else {
        rows[rows.length - 1].text = `${rows[rows.length - 1].text} ${cleaned}`;
      }
    }
    if (!rows.length) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    chapters.push(...rows.filter((row) => row.text.length > 10));
  }
  return chapters;
}

async function parseSacredThingsChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const url = chapter === 1
      ? source.url
      : `https://www.sacredthings.org/docs/assumption-${chapter}`;
    const html = await fetchText(url);
    const verses = [...html.matchAll(/<p>\s*<strong>(\d+)<\/strong>\s*([\s\S]*?)<\/p>/gi)]
      .map((match) => ({
        chapter,
        verse: Number(match[1]),
        text: stripHtml(match[2]),
        sourceUrl: url
      }))
      .filter((row) => row.text.length > 10);
    if (!verses.length) throw new Error(`لم تُكتشف أعداد الإصحاح ${chapter} في ${source.slug}`);
    chapters.push(...verses);
  }
  return chapters;
}

async function parseTauEthiopicChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const url = chapter === 1
      ? source.url
      : `https://www.tau.ac.il/~hacohen/Henoch/Henoch%20${chapter}.html`;
    const html = await fetchText(url);
    const paragraph = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => match[1])
      .find((value) => value.includes('Cap.'));
    const text = stripHtml(paragraph || '').replace(new RegExp(`^${chapter}\\s+`), '').trim();
    if (text.length < 20) throw new Error(`لم يُكتشف نص الإصحاح ${chapter} في ${source.slug}`);
    chapters.push({ chapter, verse: 1, text, sourceUrl: url });
  }
  return chapters;
}

function parseOcpChapters(xml, source) {
  const version = xml.match(new RegExp(`<version\\b[^>]*language="${source.language === 'gez' ? 'Ethiopic' : 'Latin'}"[\\s\\S]*?<\\/version>`, 'i'))?.[0];
  if (!version) throw new Error(`لم يُعثر على النسخة اللغوية في ${source.slug}`);
  const textStart = version.indexOf('<text>');
  if (textStart < 0) throw new Error(`لم يُعثر على قسم النص في ${source.slug}`);
  const body = version.slice(textStart);
  const tokenPattern = /<div\s+number="(\d+)"\s*>|<\/div\s*>|<unit\b[^>]*>|<\/unit\s*>|<reading\b[^>]*option="(\d+)"[^>]*>([\s\S]*?)<\/reading\s*>/gi;
  const chapters = [];
  let depth = 0;
  let currentChapter = null;
  let currentVerse = null;
  let currentParts = [];
  let currentUnitReadings = [];
  for (const match of body.matchAll(tokenPattern)) {
    if (match[1]) {
      const number = Number(match[1]);
      if (depth === 0) currentChapter = number;
      if (depth === 1) {
        currentVerse = number;
        currentParts = [];
      }
      depth += 1;
      continue;
    }
    if (match[0].startsWith('</div')) {
      if (depth === 2 && currentChapter && currentVerse) {
        const text = cleanText(currentParts.join(' '));
        if (text.length > 2) chapters.push({ chapter: currentChapter, verse: currentVerse, text, sourceUrl: source.url });
        currentVerse = null;
        currentParts = [];
      }
      depth -= 1;
      if (depth === 0) currentChapter = null;
      continue;
    }
    if (match[0].startsWith('<unit')) {
      currentUnitReadings = [];
      continue;
    }
    if (match[0].startsWith('</unit')) {
      const selected = currentUnitReadings.find((reading) => reading.option === 0) || currentUnitReadings[0];
      if (selected) currentParts.push(decodeHtml(selected.text));
      currentUnitReadings = [];
      continue;
    }
    if (match[2] !== undefined) {
      currentUnitReadings.push({ option: Number(match[2]), text: match[3] });
    }
  }
  const chaptersSeen = new Set(chapters.map((row) => row.chapter));
  if (chaptersSeen.size !== source.maxChapter) {
    throw new Error(`اكتُشف ${chaptersSeen.size} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return chapters;
}

async function parseChapters(content, source) {
  if (source.kind === 'structured-html') return parseStructuredHtmlChapters(source);
  if (source.kind === 'sacredthings-html') return parseSacredThingsChapters(source);
  if (source.kind === 'tau-ethiopic-html') return parseTauEthiopicChapters(source);
  if (source.kind === 'wikisource-api') return parseWikisourceChapters(content, source);
  if (source.kind === 'wikisource-book-api') return parseWikisourceBookChapters(content, source);
  if (source.kind === 'wikisource-collection') return parseWikisourceCollectionChapters(source);
  if (source.kind === 'pseudepigrapha-html') return parsePseudepigraphaChapters(content, source);
  if (source.kind === 'pseudepigrapha-chapter-html') return parsePseudepigraphaChapterHtml(content, source);
  if (source.kind === 'enoch3-collection') return parseEnoch3Chapters(source);
  if (source.kind === 'pseudepigrapha-two-column-html') return parsePseudepigraphaTwoColumnChapters(content, source);
  if (source.kind === 'new-advent-version-html') return parseNewAdventVersionChapters(content, source);
  if (source.kind === 'viachrista-html') return parseViaChristaChapters(content, source);
  if (source.kind === 'ocp-xml') return parseOcpChapters(content, source);
  const start = content.indexOf(source.anchor);
  if (start < 0) throw new Error(`لم يُعثر على بداية النص في ${source.slug}`);
  const body = content.slice(start);
  const pattern = source.bookCode === 'DIDAS'
    ? /(?:^|\n)CHAPTER\s+([IVXLCDM]+)\./gi
    : /(?:^|\n)\s*([IVXLCDM]+)\.\s+/g;
  const headings = [];
  for (const match of body.matchAll(pattern)) {
    const chapter = romanToNumber(match[1].toUpperCase());
    if (chapter === headings.length + 1 && chapter <= source.maxChapter) {
      headings.push({ chapter, start: match.index + match[0].length });
    }
  }
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return headings.map((heading, index) => ({
    chapter: heading.chapter,
    verse: 1,
    text: cleanText(body.slice(heading.start, headings[index + 1]?.start || body.length))
  })).filter((row) => row.text.length > 40);
}

async function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language,
      source_url=excluded.source_url, source_type=excluded.source_type, source_notes=excluded.source_notes,
      site_scope='bible', is_active=1
  `);
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertMany = db.transaction((rows) => rows.forEach((row) => insertVerse.run(...row)));
  const legacyEthiopic = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('gez-ocp-enoch');
  if (legacyEthiopic) {
    db.prepare('UPDATE bible_translations SET is_active=0 WHERE id=?').run(legacyEthiopic.id);
  }

  for (const [index, source] of SOURCES.entries()) {
    insertTranslation.run(
      source.slug, source.nameAr, source.nameEn, source.abbreviation,
      source.language, source.url, source.sourceType, source.notes, 40 + index
    );
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id;
    const content = ['structured-html', 'sacredthings-html'].includes(source.kind)
      ? null
      : await fetchText(source.url);
    const parsedChapters = await parseChapters(content, source);
    const rows = parsedChapters.map((chapter) => [
      translationId, source.bookCode, chapter.chapter, chapter.verse, chapter.text,
      normalizeArabicText(chapter.text), chapter.sourceUrl || source.url
    ]);
    insertMany(rows);
    db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code=?')
      .run(source.maxChapter, source.maxChapter, source.bookCode);
    db.prepare(`
      UPDATE bible_book_metadata
      SET text_status='complete', original_language=COALESCE(NULLIF(?, ''), original_language),
          english_status=CASE WHEN ?='en' THEN 'available' ELSE english_status END,
          source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(source.originalLanguage || '', source.language, source.nameEn, source.url, source.notes, source.bookCode);
    db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(translationId);
    console.log(`[Bible] ${source.slug}: ${new Set(parsedChapters.map((row) => row.chapter)).size} إصحاحاً، ${rows.length} وحدة`);
  }
}

run().catch((error) => {
  console.error('[Bible noncanonical import]', error.message);
  process.exit(1);
});
