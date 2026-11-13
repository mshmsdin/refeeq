/**
 * استيراد نصوص إنجليزية كاملة من طبعات قديمة معلنة الملكية العامة.
 * تُحفظ النصوص بوحدة واحدة لكل إصحاح لأن هذه الأعمال لا تملك تقسيماً موحداً
 * إلى أعداد في المصادر المختارة.
 */

import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';
import { fetchText } from './source_fetch.js';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parseReviewedText, parseReviewedChapterText, parseReviewedUnitText } from './reviewed_text_source.js';

export const SOURCES = [
  {
    bookCode: 'IGNEPH', slug: 'en-anf-ephesians', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى أفسس', nameEn: 'ANF English Ignatius to the Ephesians', abbreviation: 'IGNEPH-EN',
    url: 'https://www.newadvent.org/fathers/0104.htm', kind: 'complete-letter-html', maxChapter: 21, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى أفسس، 21 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNMAG', slug: 'en-anf-magnesians', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى مغنيسية', nameEn: 'ANF English Ignatius to the Magnesians', abbreviation: 'IGNMAG-EN',
    url: 'https://www.newadvent.org/fathers/0105.htm', kind: 'complete-letter-html', maxChapter: 15, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى مغنيسية، 15 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNTRA', slug: 'en-anf-trallians', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى ترالس', nameEn: 'ANF English Ignatius to the Trallians', abbreviation: 'IGNTRA-EN',
    url: 'https://www.newadvent.org/fathers/0106.htm', kind: 'complete-letter-html', maxChapter: 13, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى ترالس، 13 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNROM', slug: 'en-anf-romans', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى رومية', nameEn: 'ANF English Ignatius to the Romans', abbreviation: 'IGNROM-EN',
    url: 'https://www.newadvent.org/fathers/0107.htm', kind: 'complete-letter-html', maxChapter: 10, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى رومية، 10 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNPHI', slug: 'en-anf-philadelphians', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى فيلادلفية', nameEn: 'ANF English Ignatius to the Philadelphians', abbreviation: 'IGNPHI-EN',
    url: 'https://www.newadvent.org/fathers/0108.htm', kind: 'complete-letter-html', maxChapter: 11, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى فيلادلفية، 11 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNSMY', slug: 'en-anf-smyrnaeans', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى سميرنا', nameEn: 'ANF English Ignatius to the Smyrnaeans', abbreviation: 'IGNSMY-EN',
    url: 'https://www.newadvent.org/fathers/0109.htm', kind: 'complete-letter-html', maxChapter: 13, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى سميرنا، 13 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'IGNPOL', slug: 'en-anf-polycarp', nameAr: 'الترجمة الإنجليزية القديمة: رسالة إغناطيوس إلى بوليكاربوس', nameEn: 'ANF English Ignatius to Polycarp', abbreviation: 'IGNPOL-EN',
    url: 'https://www.newadvent.org/fathers/0110.htm', kind: 'complete-letter-html', maxChapter: 8, language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة إغناطيوس إلى بوليكاربوس، 8 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. النص يمثل الرسالة في الصيغة المتوسطة ذات الرسائل السبع المقبولة لدى الباحثين، ولا يدمج إضافات الصيغة المطولة. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'POLPHI', slug: 'en-anf-polycarp-philippians', nameAr: 'الترجمة الإنجليزية القديمة: رسالة بوليكاربوس إلى أهل فيلبي', nameEn: 'ANF English Polycarp to the Philippians', abbreviation: 'POLPHI-EN',
    url: 'https://www.newadvent.org/fathers/0136.htm', kind: 'complete-letter-html', maxChapter: 14, language: 'en', originalLanguage: 'اليونانية مع ختام محفوظ باللاتينية', sourceType: 'public-domain-text',
    notes: 'الترجمة الإنجليزية لألكسندر روبرتس وجيمس دونالدسن في آباء ما قبل نيقية، المجلد الأول، طبعة ١٨٨٥. رسالة بوليكاربوس إلى أهل فيلبي، 14 فصلاً، مع التحية وعناوين الفصول وخاتمة النص. الفصول الأخيرة محفوظة باللاتينية، ولا تدعي الإضافة وجود أصل يوناني كامل. الترجمة القديمة ملك عام؛ الاستيراد يستبعد إعلانات الموقع وتذييله.'
  },
  {
    bookCode: 'EPISTAP', slug: 'en-james-epistle-apostles', nameAr: 'ترجمة جيمس الإنجليزية لرسالة الرسل', nameEn: 'M. R. James English Epistle of the Apostles', abbreviation: 'EPISTAP-EN',
    url: 'https://en.wikisource.org/wiki/The_Apocryphal_New_Testament_(1924)/Epistles/The_Epistle_of_the_Apostles?action=render', kind: 'epistle-apostles-html', maxChapter: 51,
    language: 'en', originalLanguage: 'الجعزية والقبطية مع أصل يوناني مفترض', sourceType: 'public-domain-text',
    notes: 'ترجمة مونتاغيو رودس جيمس، العهد الجديد الأبوكريفي، أكسفورد، ١٩٢٤، الصفحات ٤٨٥–٥٠٣؛ ٥١ قسماً. تعتمد النسخة الجعزية الكاملة مع مقارنة الشاهد القبطي الجزئي واللاتيني. كل قسم فصل مستقل؛ تعليقات المقارنة في النص محفوظة، وحواشي الطبعة في رابط المصدر. لا تشمل وصية الجليل المستقلة التي يقتبس المترجم منها جملة في مقدمته.'
  },
  {
    bookCode: 'LAOD', slug: 'en-james-laodiceans',
    nameAr: 'ترجمة جيمس الإنجليزية للرسالة إلى اللاودكيين', nameEn: 'M. R. James English Epistle to the Laodiceans', abbreviation: 'LAOD-EN',
    url: 'https://en.wikisource.org/wiki/The_Apocryphal_New_Testament_(1924)/Epistles/The_Epistle_to_the_Laodiceans?action=render',
    kind: 'strict-numbered-paragraphs', maxChapter: 1, maxUnits: 20,
    language: 'en', originalLanguage: 'اللاتينية', sourceType: 'public-domain-text',
    notes: 'ترجمة مونتاغيو رودس جيمس من اللاتينية، العهد الجديد الأبوكريفي، أكسفورد، ١٩٢٤، الصفحتان ٤٧٨–٤٧٩؛ عشرون عدداً متصلة، في فصل واحد. الترجمة القديمة ملك عام. رسالة منسوبة إلى بولس، ولا تعني إضافتها إثبات نسبتها إليه.'
  },
  {
    bookCode: 'ACTTHOM', slug: 'en-james-acts-thomas',
    nameAr: 'ترجمة جيمس الإنجليزية لأعمال توما', nameEn: 'M. R. James English Acts of Thomas', abbreviation: 'ACTTHOM-EN',
    url: 'http://www.gnosis.org/library/actthom.htm', kind: 'acts-thomas-html', maxChapter: 14,
    language: 'en', originalLanguage: 'السريانية واليونانية', sourceType: 'public-domain-text',
    notes: 'ترجمة مونتاغيو رودس جيمس، العهد الجديد الأبوكريفي، أكسفورد، ١٩٢٤. النص الرقمي المصحح لدى مكتبة الجمعية الغنوصية؛ ١٧٠ قسماً مرقماً موزعة على الأجزاء الثلاثة عشر والاستشهاد. تحفظ أرقام الأقسام الأصلية عبر الأجزاء، وتعليقات الطبعة والقراءات البديلة. النص القديم ملك عام؛ لا تشمل الإضافة مقدمات محرري الموقع الحديثة.'
  },
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
    bookCode: 'DID-ETH',
    slug: 'en-harden-ethiopic-didascalia',
    nameAr: 'الترجمة الإنجليزية للدسقولية الإثيوبية',
    nameEn: 'J. M. Harden English Ethiopic Didascalia',
    abbreviation: 'DID-ETH-EN',
    url: 'https://ertale.com/bible/ethiopiancanon/didascalia/{chapter}/',
    kind: 'ertale-chapter-html',
    maxChapter: 43,
    language: 'en',
    originalLanguage: 'الجعزية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ج. م. هاردن المنشورة سنة 1920، من الجعزية، ومعلنة الملكية العامة في المصدر؛ يحفظ كل إصحاح كوحدة واحدة لأن النثر لا يقدم تقسيم أعداد أصلياً ثابتاً، مع وسمها تقليداً إثيوبياً منفصلاً عن الدسقولية السريانية.'
  },
  {
    bookCode: 'SIN',
    slug: 'en-horner-ethiopic-sinodos-teezaz',
    nameAr: 'الترجمة الإنجليزية للسينودس الإثيوبي: تغسات الرسل',
    nameEn: 'George Horner English Ethiopic Sinodos Teezaz',
    abbreviation: 'SIN-TEEZAZ-EN',
    url: 'https://ertale.com/bible/ethiopiancanon/teezaz/{chapter}/',
    kind: 'ertale-chapter-html',
    maxChapter: 73,
    language: 'en',
    originalLanguage: 'الجعزية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة جورج هورنر المنشورة سنة 1904 والمعلنة الملكية العامة؛ هذا سجل فرعي واحد من مجموعة السينودس الإثيوبي، وليس المجموعة كلها.'
  },
  {
    bookCode: 'COV1',
    slug: 'en-cooper-maclean-book-covenant-1',
    nameAr: 'الترجمة الإنجليزية لكتاب العهد الأول',
    nameEn: 'Cooper and Maclean English Book of Covenant I',
    abbreviation: 'COV1-EN',
    url: 'https://ertale.com/bible/ethiopiancanon/bookofthecovenant1/{chapter}/',
    kind: 'ertale-chapter-html',
    maxChapter: 74,
    language: 'en',
    originalLanguage: 'السريانية مع التقليد الجعزي',
    sourceType: 'public-domain-text',
    notes: 'ترجمة جيمس كوبر وأ. ج. مكلين المنشورة سنة 1902؛ المصدر يوضح أنها من التقليد السرياني لوصية ربنا، وليست ترجمة مباشرة من الجعزية، لذلك يحفظ الشاهد مع هذا التنبيه.'
  },
  {
    bookCode: 'COV2',
    slug: 'en-james-book-covenant-2',
    nameAr: 'الترجمة الإنجليزية لكتاب العهد الثاني',
    nameEn: 'M. R. James English Book of Covenant II',
    abbreviation: 'COV2-EN',
    url: 'https://ertale.com/bible/ethiopiancanon/bookofthecovenant2/{chapter}/',
    kind: 'ertale-chapter-html',
    maxChapter: 51,
    language: 'en',
    originalLanguage: 'القبطية مع التقليد الجعزي',
    sourceType: 'public-domain-text',
    notes: 'ترجمة م. ر. جيمس المنشورة سنة 1924 والمعلنة الملكية العامة في الولايات المتحدة؛ وهي أقرب شاهد إنجليزي عام لكتاب العهد الثاني الإثيوبي المرتبط برسالة الرسل.'
  },
  {
    bookCode: 'CLE-ETH',
    slug: 'en-james-ethiopic-clement-2',
    nameAr: 'مقتطف إنجليزي من رؤيا بطرس الإثيوبية في الكتاب الثاني لإكليمندس',
    nameEn: 'M. R. James Ethiopic Apocalypse of Peter excerpt in Clement Book II',
    abbreviation: 'CLE-ETH-EN',
    url: 'https://ertale.com/bible/ethiopiancanon/clement2/{chapter}/',
    kind: 'ertale-chapter-html',
    maxChapter: 68,
    skipChapters: [23],
    incomplete: true,
    language: 'en',
    originalLanguage: 'الجعزية مع أصل رؤيوي أقدم',
    sourceType: 'public-domain-text',
    notes: 'ترجمة م. ر. جيمس، طبعة ١٩٢٤. هذا مقتطف من رؤيا بطرس الإثيوبية المحفوظة ضمن الكتاب الثاني لإكليمندس؛ ليس نص الكتاب الثاني كاملاً. المصدر الرقمي يقسم المقتطف إلى ٦٨ صفحة/مقطعاً، والصفحة ٢٣ لا تعرض إلا بقايا تعرف ضوئي على الحروف، فلا يثبت ذلك فقد فصل قديم. جيمس يقول إن الكتاب الإثيوبي يتواصل بعد المقتطف بنص لاحق لم يترجمه هنا. يُحفظ السجل جزئياً ولا تُخترع الصفحة التالفة.'
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
    bookCode: '4BAR',
    slug: 'en-kraft-4-baruch-longer',
    nameAr: 'الترجمة الإنجليزية الأطول لباروخ الرابع',
    nameEn: 'Kraft and Purintun English 4 Baruch (Longer Version)',
    abbreviation: '4BAR-EN-L',
    url: 'https://intertextual.bible/read/4-baruch/1',
    kind: 'intertextual-book-sections-html',
    maxChapter: 9,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-noncommercial',
    notes: 'طبعة مركز تحليل النصوص بالحاسوب (جامعة بنسلفانيا)، تحرير روبرت كرافت، ١٥ ديسمبر ١٩٨٧؛ النسخة الأطول مبنية على ترجمة روبرت كرافت وآن إليزابيث بورنتن المنشورة سنة ١٩٧٢. يصرح المصدر بإتاحتها للاستخدام غير التجاري بشرط إرفاق هذا التنبيه كاملاً مع كل نسخة موزعة والإبلاغ عن الأخطاء والتصحيحات والمشكلات إلى الموزع: English Translation of the Longer and Shorter Versions of the Paraleipomena Jeremiou: Public Domain CATSS edition by Robert A. Kraft, 15 Dec 1987. Filesize uncompressed: about 48 K. Freely available for non-commercial use provided that this header is included in its entirety with any copy distributed and that errors/corrections or other problems are reported to the distributor: Center for Computer Analysis of Texts Religious Studies / Cohen Hall, University of Pennsylvania, Philadelphia PA 19104-6304 USA. The Longer Version is based on Paraleipomena Jeremiou: An English Translation, by Robert Kraft and Ann Elizabeth Purintun (Seminar Papers of the Society of Biblical Literature for 1971, vol. 2; SBL, 1971, 327-346), which appeared in slightly revised form in their 1972 edition of Paraleipomena Jeremiou (Texts and Translations 1: Pseudepigrapha Series 1; Missoula Montana: Scholars Press for the SBL, 1972). The Shorter Version was translated by William Newby and edited for electronic publication by Robert Kraft. Both Versions were included on the Experimental CD-ROM #1 published by the Packard Humanities Institute in cooperation with CCAT in December 1987.'
  },
  {
    bookCode: '2BAR',
    slug: 'en-charles-2-baruch',
    nameAr: 'الترجمة الإنجليزية لباروخ الثاني',
    nameEn: 'R. H. Charles English 2 Baruch',
    abbreviation: '2BAR-EN',
    url: 'https://intertextual.bible/read/2-baruch/1',
    kind: 'intertextual-book-sections-html',
    maxChapter: 87,
    language: 'en',
    originalLanguage: 'السريانية مع شواهد يونانية وآرامية',
    sourceType: 'public-domain-text',
    notes: 'نص كامل مبني على ترجمة آر. هـ. تشارلز المنشورة سنة 1913 والمعلنة ملكاً عاماً في المصدر؛ يتضمن 87 إصحاحاً. لا توجد ترجمة عربية مدخلة في هذه المرحلة، وتُترك للمقارنة والترجمة اللاحقة.'
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
    notes: 'ترجمة دبليو. أ. كريغي المنشورة في آباء ما قبل نيقية، وتعرض النسخة الثانية من وصية إبراهيم في ١٥ مقطعاً مرقماً؛ تحفظ منفصلة لأن النسختين تختلفان في الطول والترتيب.'
  },
  {
    bookCode: 'TJOB',
    slug: 'en-wesley-testament-job',
    nameAr: 'الترجمة الإنجليزية لوصية أيوب',
    nameEn: 'M. R. James English Testament of Job',
    abbreviation: 'TJOB-EN',
    url: 'https://wesley.nnu.edu/sermons-essays-books/noncanonical-literature/noncanonical-literature-ot-pseudepigrapha/testament-of-job/',
    kind: 'wesley-testament-html',
    maxChapter: 12,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'web-edition',
    notes: 'ترجمة م. ر. جيمس المنشورة سنة 1897، في ١٢ إصحاحاً؛ حُفظت الوحدات المرقمة بترتيب ظهورها لأن المصدر يكرر بعض أرقام الفقرات ويحتوي أحياناً على ترقيم غير منتظم.'
  },
  {
    bookCode: 'JOSEPH',
    slug: 'en-sparks-joseph-aseneth',
    nameAr: 'الترجمة الإنجليزية ليوسف وأسنات',
    nameEn: 'The Firmament English Joseph and Aseneth',
    abbreviation: 'JOSEPH-EN',
    url: 'https://www.thefirmament.org/scripture/joseph-and-aseneth/',
    kind: 'firmament-joseph-aseneth-html',
    maxChapter: 29,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'web-edition',
    notes: 'نص إنجليزي كامل في صفحة ويب واحدة من ٢٩ إصحاحاً و٣٥٨ وحدة مدخلة؛ المترجم أو الطبعة غير معلنين بوضوح في الصفحة، لذلك يسجل كشاهد ويب يحتاج إلى توثيق ومقارنة لاحقين، ولا يخلط مع الصيغة الأقصر المنسوبة إلى يوجين ماسون.'
  },
  {
    bookCode: 'TADAM',
    slug: 'en-charles-life-adam-eve',
    nameAr: 'الترجمة الإنجليزية لحياة آدم وحواء',
    nameEn: 'R. H. Charles English Life of Adam and Eve',
    abbreviation: 'TADAM-EN',
    url: 'https://onthewaytoithaca.wordpress.com/apocrypha-collection/vita-adae-et-evae-en/',
    kind: 'vita-adae-eve-html',
    maxChapter: 57,
    replaceExistingVerses: true,
    expectedUnits: 168,
    language: 'en',
    originalLanguage: 'اليونانية واللاتينية مع صيغ موازية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز للنص اللاتيني من طبعة 1913. استخرجت خلايا الجدول الـ١٦٨ في ٥٧ إصحاحاً، ورقمتها بحسب ترتيب الظهور لأن المصدر يكرر بعض الأرقام ويحوي خلايا غير مغلقة في مواضع؛ لا تخلط مع رؤيا موسى اليونانية أو الصيغ السلافية والأرمنية والقبطية.'
  },
  {
    bookCode: 'APMO',
    slug: 'en-wells-apocalypse-moses',
    nameAr: 'رؤيا موسى (الصيغة اليونانية)',
    nameEn: 'The Apocalypse of Moses (Wells, Charles 1913)',
    abbreviation: 'APMO-EN',
    url: 'https://www.ccel.org/c/charles/otpseudepig/apcmose.htm',
    kind: 'apocalypse-moses-html',
    maxChapter: 43,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ويليامز ويلز ضمن طبعة تشارلز الأكاديمية المنشورة سنة 1913؛ النص هو الصيغة اليونانية من حياة آدم وحواء، مستقل عن حياة آدم وحواء اللاتينية (TADAM) وعن وصية/صعود موسى (MOS).'
  },
  {
    bookCode: 'ARIST',
    slug: 'en-charles-letter-aristeas',
    nameAr: 'الترجمة الإنجليزية لرسالة أريستاس',
    nameEn: 'R. H. Charles English Letter of Aristeas',
    abbreviation: 'ARIST-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/aristeas.htm',
    kind: 'pseudepigrapha-single-html',
    maxChapter: 1,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'تحرير آر. هـ. تشارلز المنشور سنة 1913؛ الرسالة طويلة وغير مقسمة إلى إصحاحات ثابتة في المصدر، لذلك تحفظ هنا كوحدة واحدة، مع إمكانية إعادة تقسيم الفقرات ومقارنتها لاحقاً.'
  },
  {
    bookCode: 'GIANTS',
    slug: 'en-henning-manichaean-book-giants',
    importEligible: false,
    nameAr: 'الترجمة الإنجليزية لكتاب العمالقة المانوي',
    nameEn: 'W. B. Henning English Manichaean Book of Giants',
    abbreviation: 'GIANTS-EN',
    url: 'https://othergospels.com/2giants/henning.json',
    kind: 'other-gospels-json',
    maxChapter: 10,
    incomplete: true,
    language: 'en',
    originalLanguage: 'الآرامية واللغات الإيرانية في شواهد متعددة',
    sourceType: 'rights-unresolved-eu',
    notes: 'ترجمة وليم ب. هننغ المنشورة سنة 1943 للنسخة المانوية المجزأة؛ يحفظها السجل كشاهد جزئي مستقل عن شواهد قمران الآرامية. يصف موقع المصدر الترجمة بأنها ملك عام دون تحديد النطاق الجغرافي؛ توفي هننغ سنة 1967، وبموجب مدة الحماية الأوروبية البالغة 70 سنة بعد الوفاة لا أعتمد هذا الادعاء وحده لإعادة النشر في الاتحاد الأوروبي. أوقف الاستيراد من هذا المصدر حتى إثبات إذن صالح أو انتهاء الحماية.'
  },
  {
    bookCode: 'TSOL',
    slug: 'en-wikisource-testament-solomon',
    nameAr: 'الترجمة الإنجليزية لوصية سليمان',
    nameEn: 'Wikisource English Testament of Solomon',
    abbreviation: 'TSOL-EN',
    url: 'https://en.wikisource.org/wiki/Testament_of_Solomon',
    kind: 'testament-solomon-wikisource-html',
    maxChapter: 1,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة إنجليزية قديمة منشورة في طبعة ويكي مصدر تعود إلى سنة 1898؛ تحفظ هنا في فصل واحد مع أعداد متتابعة من فقرات الصفحة، لأن تقسيمها المنشور لا يطابق تقسيماً حديثاً ثابتاً.'
  },
  {
    bookCode: 'DID',
    slug: 'en-hoole-didache',
    nameAr: 'الترجمة الإنجليزية للديداخي',
    nameEn: 'Charles H. Hoole English Didache',
    abbreviation: 'DID-EN',
    url: 'https://earlychristianwritings.com/text/didache-hoole.html',
    kind: 'chaptered-html',
    maxChapter: 16,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة تشارلز هـ. هول المنشورة سنة 1894؛ تحفظ الفصول الستة عشر، وتعرض بوصفها كتابة كنسية مبكرة لا سفراً قانونياً.'
  },
  {
    bookCode: 'PJA',
    slug: 'en-roberts-donaldson-protevangelium-james',
    nameAr: 'الترجمة الإنجليزية لإنجيل يعقوب التمهيدي',
    nameEn: 'Roberts-Donaldson English Protevangelium of James',
    abbreviation: 'PJA-EN',
    url: 'https://en.wikisource.org/wiki/Protevangelion_of_James_(Roberts-Donaldson_translation)',
    kind: 'wikisource-numbered-paragraphs',
    maxChapter: 24,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ألكسندر ووكر ضمن طبعة الآباء قبل نيقية؛ تحفظ المقاطع الأربعة والعشرين المرقمة في المصدر، مع وسمها كنص طفولة أبوكريفي.'
  },
  {
    bookCode: 'BARN',
    slug: 'en-hoole-barnabas',
    nameAr: 'الترجمة الإنجليزية لرسالة برنابا',
    nameEn: 'Charles H. Hoole English Epistle of Barnabas',
    abbreviation: 'BARN-EN',
    url: 'https://en.wikisource.org/wiki/Epistle_of_Barnabas_(Hoole_translation)',
    kind: 'chaptered-paragraph-html',
    maxChapter: 21,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة تشارلز هـ. هول المنشورة سنة 1885؛ تحفظ الفصول الإحدى والعشرين كما يقسمها المصدر، وتعرض بوصفها كتابة كنسية مبكرة لا سفراً قانونياً.'
  },
  {
    bookCode: 'DIAT',
    slug: 'en-hogg-diatessaron',
    nameAr: 'الترجمة الإنجليزية لدِيَاتِسَرون تاتيان',
    nameEn: 'Hope W. Hogg English Diatessaron of Tatian',
    abbreviation: 'DIAT-EN',
    url: 'https://en.wikisource.org/wiki/Ante-Nicene_Fathers/Volume_IX/The_Diatessaron_of_Tatian/The_Diatessaron/Section_{chapter}',
    kind: 'diatessaron-wikisource',
    maxChapter: 53,
    language: 'en',
    originalLanguage: 'السريانية أو اليونانية مع شاهد عربي لاحق',
    sourceType: 'public-domain-text',
    notes: 'ترجمة هوب و. هوغ المنشورة في مجموعة آباء ما قبل نيقية؛ الأصل التوفيقي الكامل مفقود، والنص المنشور ترجمة إنجليزية عن الشاهد العربي. تحفظ الأقسام الثلاثة والخمسين، وتقسم الوحدات بحسب العلامات الرقمية الظاهرة في المصدر.'
  },
  {
    bookCode: 'ODSO',
    slug: 'en-zinner-mattison-odes-solomon',
    nameAr: 'الترجمة الإنجليزية لأوديات سليمان',
    nameEn: 'Samuel Zinner and Mark M. Mattison English Odes of Solomon',
    abbreviation: 'ODSO-EN',
    url: 'https://en.wikisource.org/w/api.php?action=parse&page=User%3ANebulousquasar%2FOdes_of_Solomon&prop=wikitext&format=json&origin=*',
    kind: 'odes-solomon-wikisource',
    maxChapter: 42,
    witness: 'syriac',
    language: 'en',
    originalLanguage: 'السريانية واليونانية والقبطية في شواهد مختلفة',
    sourceType: 'public-domain-text',
    notes: 'ترجمة نُهرة 2021 المنسوبة إلى صموئيل زِنر للمواد السريانية ومارك م. ماتيسون للمواد القبطية واليونانية، وهي معلنة الملكية العامة. يحفظ السجل ٤٢ أوداً ويختار القسم السرياني عند وجود صيغتين؛ تُترك الصيغة القبطية المقابلة لسجل مقارنة مستقل لاحقاً.'
  },
  {
    bookCode: 'GTINF',
    slug: 'en-walker-infant-thomas-greek-a',
    nameAr: 'الترجمة الإنجليزية لإنجيل طفولة توما، الصيغة اليونانية الأولى',
    nameEn: 'Alexander Walker English Infancy Gospel of Thomas, Greek A',
    abbreviation: 'GTINF-GA-EN',
    url: 'https://en.wikisource.org/wiki/The_Apocryphal_Gospels_and_other_documents_relating_to_the_History_of_Christ/The_Gospel_of_Thomas_(I.)',
    kind: 'wikisource-roman-chapter-html',
    maxChapter: 19,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ألكسندر ووكر التاريخية للصيغة اليونانية الأولى، محفوظة في ١٩ إصحاحاً كما يقسمها ويكي مصدر، مع إبقائها شاهداً مستقلاً لا نصاً موحداً لكل صيغ إنجيل الطفولة.'
  },
  {
    bookCode: 'GTINF',
    slug: 'en-walker-infant-thomas-greek-b',
    nameAr: 'الترجمة الإنجليزية لإنجيل طفولة توما، الصيغة اليونانية الثانية',
    nameEn: 'Alexander Walker English Infancy Gospel of Thomas, Greek B',
    abbreviation: 'GTINF-GB-EN',
    url: 'https://en.wikisource.org/wiki/The_Apocryphal_Gospels_and_other_documents_relating_to_the_History_of_Christ/The_Gospel_of_Thomas_(II.)',
    kind: 'wikisource-roman-chapter-html',
    maxChapter: 11,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ألكسندر ووكر التاريخية للصيغة اليونانية الثانية الأقصر، محفوظة في ١١ إصحاحاً، وتعرض منفصلة عن الصيغة الأطول لإظهار الفروق النصية.'
  },
  {
    bookCode: 'GTINF',
    slug: 'en-walker-infant-thomas-latin',
    nameAr: 'الترجمة الإنجليزية لإنجيل طفولة توما، الصيغة اللاتينية',
    nameEn: 'Alexander Walker English Infancy Gospel of Thomas, Latin',
    abbreviation: 'GTINF-LA-EN',
    url: 'https://en.wikisource.org/wiki/The_Apocryphal_Gospels_and_other_documents_relating_to_the_History_of_Christ/The_Gospel_of_Thomas_(III.)',
    kind: 'wikisource-roman-chapter-html',
    maxChapter: 15,
    language: 'en',
    originalLanguage: 'اللاتينية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ألكسندر ووكر التاريخية للصيغة اللاتينية، محفوظة في ١٥ إصحاحاً، وتعرض منفصلة عن الشاهدين اليونانيين للمقارنة اللاحقة.'
  },
  {
    bookCode: 'GTH',
    slug: 'en-lambdin-gospel-thomas',
    nameAr: 'الترجمة الإنجليزية لإنجيل توما',
    nameEn: 'Thomas O. Lambdin English Gospel of Thomas',
    abbreviation: 'GTH-EN',
    url: 'https://www.earlychristianwritings.com/text/thomas-lambdin.html',
    kind: 'gospel-thomas-sayings-html',
    maxChapter: 1,
    maxUnits: 114,
    language: 'en',
    originalLanguage: 'القبطية مع شواهد يونانية',
    sourceType: 'web-edition',
    notes: 'ترجمة توماس أو. لامبدين لأقوال إنجيل توما المحفوظة في مخطوط نجع حمادي؛ تعرض في سجل واحد و١١٤ قولاً مرقماً، مع ترك مكان للغة القبطية والترجمة العربية والمقارنة مع الشواهد اليونانية.'
  },
  {
    bookCode: 'GMA',
    slug: 'en-gnostic-society-gospel-mary',
    nameAr: 'الترجمة الإنجليزية لإنجيل مريم',
    nameEn: 'Gnostic Society English Gospel of Mary',
    abbreviation: 'GMA-EN',
    url: 'https://www.earlychristianwritings.com/text/gospelmary.html',
    kind: 'earlychristian-gospel-mary-html',
    maxChapter: 9,
    chapterLabels: [4, 5, 8, 9],
    incomplete: true,
    language: 'en',
    originalLanguage: 'القبطية واليونانية',
    sourceType: 'web-edition',
    notes: 'ترجمة إنجليزية للشاهد القبطي المجزأ؛ الإصحاحات ١–٣ مفقودة، والمتاح في المصدر هو ٤ و٥ و٨ و٩، لذلك يحفظ الموقع الفجوات كما هي ولا يعرضها كنص كامل.'
  },
  {
    bookCode: 'GJUD',
    slug: 'en-mattison-gospel-judas',
    nameAr: 'الترجمة الإنجليزية لإنجيل يهوذا',
    nameEn: 'Mark M. Mattison Public Domain English Gospel of Judas',
    abbreviation: 'GJUD-EN',
    url: 'https://www.gospels.net/judas',
    kind: 'gospels-net-paragraph-html',
    maxChapter: 1,
    maxUnits: 71,
    incomplete: true,
    language: 'en',
    originalLanguage: 'القبطية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة مارك م. ماتيسون المعلنة ملكيتها العامة، مبنية على النص القبطي لمخطوط كودكس تشاكوس 3. لا يملك المصدر تقسيماً ثابتاً إلى إصحاحات، لذلك تحفظ الفقرات والعناوين في إصحاح واحد، مع إبقاء الفجوات والإضافات التحريرية كما في المصدر.'
  },
  {
    bookCode: 'GPE',
    slug: 'en-mr-james-gospel-peter',
    nameAr: 'الترجمة الإنجليزية لإنجيل بطرس',
    nameEn: 'M. R. James English Gospel of Peter',
    abbreviation: 'GPE-EN',
    url: 'https://www.earlychristianwritings.com/text/gospelpeter-mrjames.html',
    kind: 'earlychristian-fragment-html',
    startMarker: 'GOSPEL OF PETER',
    maxChapter: 1,
    incomplete: true,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'web-edition',
    notes: 'ترجمة م. ر. جيمس للشاهد اليوناني المجزأ من إنجيل بطرس؛ يحفظه الموقع في سجل واحد لأن المصدر لا يقدم تقسيماً مستقراً إلى إصحاحات وأعداد، مع وسمه نصاً مجزأً.'
  },
  {
    bookCode: 'APOL',
    slug: 'en-mr-james-acts-paul',
    nameAr: 'الترجمة الإنجليزية لأعمال بولس',
    nameEn: 'M. R. James English Acts of Paul',
    abbreviation: 'APOL-EN',
    url: 'https://www.earlychristianwritings.com/text/actspaul.html',
    kind: 'earlychristian-fragment-html',
    startMarker: 'THE ACTS OF PAUL',
    maxChapter: 1,
    incomplete: true,
    language: 'en',
    originalLanguage: 'اليونانية والقبطية مع شواهد لاتينية',
    sourceType: 'web-edition',
    notes: 'ترجمة تاريخية منشورة في موقع الكتابات المسيحية المبكرة؛ العمل مركب وشواهده مجزأة، لذلك يحفظ الشاهد المنشور في وحدة واحدة ولا يعرض كنص كامل موحد.'
  },
  {
    bookCode: 'APET',
    slug: 'en-mr-james-acts-peter',
    nameAr: 'الترجمة الإنجليزية لأعمال بطرس',
    nameEn: 'M. R. James English Acts of Peter',
    abbreviation: 'APET-EN',
    url: 'https://www.earlychristianwritings.com/text/actspeter.html',
    kind: 'earlychristian-fragment-html',
    startMarker: 'THE ACTS OF PETER',
    maxChapter: 1,
    incomplete: true,
    language: 'en',
    originalLanguage: 'اليونانية واللاتينية',
    sourceType: 'web-edition',
    notes: 'ترجمة تاريخية لشواهد أعمال بطرس؛ يحفظ الموقع النص المنشور في وحدة واحدة لأن الشواهد والتقسيمات تختلف، مع وسم العمل بأنه متعدد الأجزاء.'
  },
  {
    bookCode: 'APEP',
    slug: 'en-mr-james-apocalypse-peter',
    nameAr: 'الترجمة الإنجليزية لرؤيا بطرس',
    nameEn: 'M. R. James English Apocalypse of Peter',
    abbreviation: 'APEP-EN',
    url: 'https://www.earlychristianwritings.com/text/apocalypsepeter-mrjames.html',
    kind: 'earlychristian-fragment-html',
    startMarker: 'THE APOCALYPSE OF PETER',
    maxChapter: 1,
    incomplete: true,
    language: 'en',
    originalLanguage: 'اليونانية والجعزية',
    sourceType: 'web-edition',
    notes: 'ترجمة تاريخية لشواهد رؤيا بطرس اليونانية والإثيوبية؛ المصدر نفسه يذكر اختلاف الشواهد وعدم اكتمال النص، لذلك تحفظ المادة كشاهد مجزأ في وحدة واحدة.'
  },
  {
    bookCode: 'GNIC',
    slug: 'en-mr-james-gospel-nicodemus',
    nameAr: 'الترجمة الإنجليزية لإنجيل نيقوديموس',
    nameEn: 'M. R. James English Gospel of Nicodemus',
    abbreviation: 'GNIC-EN',
    url: 'https://earlychristianwritings.com/text/gospelnicodemus.html',
    kind: 'earlychristian-fragment-html',
    startMarker: 'THE GOSPEL OF NICODEMUS, OR ACTS OF PILATE',
    maxChapter: 1,
    language: 'en',
    originalLanguage: 'اليونانية واللاتينية مع صيغ موازية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة م. ر. جيمس التاريخية لنص إنجيل نيقوديموس/أعمال بيلاطس؛ المصدر نفسه يصف اختلاف الصيغ اليونانية واللاتينية والقبطية والسريانية والأرمنية، لذلك يحفظ هذا السجل الشاهد المنشور فقط ولا يدمج الصيغ.'
  },
  {
    bookCode: 'CLE1',
    slug: 'en-newadvent-first-clement',
    nameAr: 'الترجمة الإنجليزية للرسالة الأولى لإكليمندس',
    nameEn: 'New Advent English First Epistle of Clement',
    abbreviation: 'CLE1-EN',
    url: 'https://www.newadvent.org/fathers/1010.htm',
    kind: 'new-advent-chaptered-html',
    maxChapter: 65,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة تاريخية من مجموعة آباء ما قبل نيقية منشورة في نيو أدفنت، تحفظ الفصول الخمسة والستين، وتعرض كرسالة كنسية مبكرة لا كسفر قانوني.'
  },
  {
    bookCode: 'CLE2',
    slug: 'en-newadvent-second-clement',
    nameAr: 'الترجمة الإنجليزية للرسالة الثانية لإكليمندس',
    nameEn: 'New Advent English Second Epistle of Clement',
    abbreviation: 'CLE2-EN',
    url: 'https://www.newadvent.org/fathers/1011.htm',
    kind: 'new-advent-chaptered-html',
    maxChapter: 20,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة تاريخية للرسالة الثانية المنسوبة تقليدياً إلى إكليمندس، تحفظ عشرين فصلاً، مع إبقاء نسبة العمل وتاريخه موضع وصف علمي لا حكماً قطعياً.'
  },
  {
    bookCode: 'HERM',
    slug: 'en-newadvent-shepherd-hermas-book-1',
    nameAr: 'الترجمة الإنجليزية لراعي هرماس، الكتاب الأول',
    nameEn: 'New Advent English Shepherd of Hermas Book I',
    abbreviation: 'HERM-I-EN',
    url: 'https://www.newadvent.org/fathers/02011.htm',
    kind: 'new-advent-chaptered-html',
    maxChapter: 24,
    renumberChapters: true,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'الكتاب الأول من راعي هرماس في ترجمة تاريخية منشورة في نيو أدفنت، ويحفظ مستقلاً حتى يمكن مقارنة تقسيمات الرؤى والوصايا والأمثال.'
  },
  {
    bookCode: 'HERM',
    slug: 'en-newadvent-shepherd-hermas-book-2',
    nameAr: 'الترجمة الإنجليزية لراعي هرماس، الكتاب الثاني',
    nameEn: 'New Advent English Shepherd of Hermas Book II',
    abbreviation: 'HERM-II-EN',
    url: 'https://www.newadvent.org/fathers/02012.htm',
    kind: 'new-advent-chaptered-html',
    maxChapter: 16,
    renumberChapters: true,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'الكتاب الثاني من راعي هرماس في ترجمة تاريخية منشورة في نيو أدفنت، يحفظ كترجمة مستقلة عن الكتابين الأول والثالث.'
  },
  {
    bookCode: 'HERM',
    slug: 'en-newadvent-shepherd-hermas-book-3',
    nameAr: 'الترجمة الإنجليزية لراعي هرماس، الكتاب الثالث',
    nameEn: 'New Advent English Shepherd of Hermas Book III',
    abbreviation: 'HERM-III-EN',
    url: 'https://www.newadvent.org/fathers/02013.htm',
    kind: 'new-advent-chaptered-html',
    maxChapter: 60,
    renumberChapters: true,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'الكتاب الثالث من راعي هرماس في ترجمة تاريخية منشورة في نيو أدفنت، يحفظ بفصوله الثلاثة والثلاثين وبسجل مستقل للمقارنة.'
  },
  {
    bookCode: 'SIBYLL',
    slug: 'en-terry-sibylline-oracles',
    nameAr: 'الترجمة الإنجليزية لأقوال العرافات',
    nameEn: 'Milton Spenser Terry English Sibylline Oracles',
    abbreviation: 'SIBYLL-EN',
    url: 'https://en.wikisource.org/wiki/The_Sibylline_Oracles_(Terry,_2nd_edition)',
    kind: 'wikisource-rendered-collection',
    maxChapter: 12,
    language: 'en',
    originalLanguage: 'اليونانية',
    sourceType: 'public-domain-text',
    notes: 'ترجمة ميلتون سبنسر تيري المنشورة سنة 1899 في ويكي مصدر؛ تحفظ الكتب المتاحة 1–8 و11–14 كسجلات مستقلة، لأن الكتابين 9 و10 غير موجودين في هذه الطبعة المنشورة هناك.' ,
    pages: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14]
  },
  {
    bookCode: 'APOEZ',
    slug: 'en-greekdoc-apocryphon-ezekiel-fragments',
    nameAr: 'الشواهد الإنجليزية لرؤيا حزقيال',
    nameEn: 'English Apocryphon of Ezekiel Fragments',
    abbreviation: 'APOEZ-EN',
    url: 'https://greekdoc.com/DOCUMENTS/pseudepigrapha/ap-ezekiel.html',
    kind: 'apocryphon-ezekiel-fragments-html',
    maxChapter: 5,
    incomplete: true,
    language: 'en',
    originalLanguage: 'اليونانية واللاتينية مع أصل آرامي محتمل',
    sourceType: 'fragmentary-web-edition',
    notes: 'خمسة شواهد إنجليزية مترجمة من مقتطفات يونانية ولاتينية محفوظة في اقتباسات الآباء؛ لا يمثل النص الكامل المفقود، وتبقى مواضع الشواهد وسياقها النقدي بحاجة إلى مقارنة مستقلة.'
  },
  {
    bookCode: 'ENO',
    slug: 'gez-dillmann-enoch',
    nameAr: 'النص الجعزي لأخنوخ الأول',
    nameEn: 'August Dillmann Digital Ethiopic 1 Enoch',
    abbreviation: 'ENO-GEZ',
    url: 'https://www.tau.ac.il/~hacohen/Henoch/Henoch%201.html',
    kind: 'tau-ethiopic-html',
    importEligible: false,
    maxChapter: 108,
    language: 'gez',
    originalLanguage: 'الجعزية',
    sourceType: 'critical-ethiopic',
    notes: 'تفريغ ميخال يرابيك لعام 1995 لطبعة دِلمن الجعزية؛ صفحة المصدر تنسب التفريغ الرقمي إلى ران هكوهين وتقصر الإذن على الاستخدام غير التجاري، لذا لا يُعاد استيراده. طبعة دِلمن المصورة لعام 1851 متاحة بعلامة الملك العام في مكتبة جامعة بون، لكن إنشاء تفريغ مستقل منها ما زال مطلوباً.'
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
    incomplete: true,
    language: 'en',
    originalLanguage: 'اللاتينية',
    sourceType: 'public-domain-translation',
    notes: 'ترجمة ر. هـ. تشارلز عن اللاتينية في طبعة ١٨٩٧؛ انتهت مدة حمايتها الأوروبية بعد ٧٠ سنة من وفاة المؤلف سنة ١٩٣١. تعرض صفحة المصدر الإصحاحات الباقية، مع إبقاء الانقطاع قبل الخاتمة وعدم استكماله.'
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
    expectedUnits: 134,
    incomplete: true,
    language: 'la',
    originalLanguage: 'اللاتينية',
    sourceType: 'tei-xml',
    notes: 'الشاهد اللاتيني المحرر إلكترونياً في مشروع النصوص النقدية الرقمية المفتوحة، وفق طبعة أ. م. تشيرياني (١٨٦١)، وملفاته متاحة برخصة المشاع الإبداعي: النسب ٤٫٠. يحفظ الشاهد الباقي اثني عشر إصحاحاً و١٣٤ وحدة، وينقطع قبل الخاتمة؛ سُجل جزئياً ولم تُستكمل الفجوة.'
  },
  {
    bookCode: 'ADAMCON', slug: 'en-malan-conflict-adam-eve',
    nameAr: 'ترجمة سليمان مالان الإنجليزية لصراع آدم وحواء', nameEn: 'S. C. Malan English Conflict of Adam and Eve', abbreviation: 'ADAMCON-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/ConflictOfAdamEve/AdamEveConflict.html', kind: 'numbered-html-chapters', maxChapter: 105,
    language: 'en', originalLanguage: 'الجعزية بوسيط عربي', sourceType: 'public-domain-text',
    notes: 'ترجمة سليمان مالان المنشورة سنة 1882 عن التقليد الإثيوبي. يضم العمل أربعة كتب؛ النسخة الرقمية تعرض 105 عناوين فصول فعلية، وقد أزيل تكرار طباعي متتالٍ في عنوان الفصل 26.'
  },
  {
    bookCode: 'JASHER', slug: 'en-wikisource-sefer-hayashar-1840',
    nameAr: 'ترجمة 1840 الإنجليزية لصيغة كتاب ياشر الوسيطة', nameEn: 'English Sefer ha-Yashar 1840', abbreviation: 'JASHER-EN',
    url: 'https://en.wikisource.org/wiki/Sefer_Ha-yashar,_or,_the_Book_of_Jasher_(1840)',
    kind: 'wikisource-jasher', maxChapter: 91, language: 'en', originalLanguage: 'العبرية', sourceType: 'public-domain-text',
    notes: 'طبعة إنجليزية تاريخية للنص اليهودي الوسيط Sefer ha-Yashar. هذا ليس كتاب ياشر القديم المفقود المذكور في يشوع 10:13 وصموئيل الثاني 1:18.'
  },
  {
    bookCode: 'AHIKAR', slug: 'en-charles-story-ahikar',
    nameAr: 'ترجمة تشارلز الإنجليزية لقصة أخيقار', nameEn: 'R. H. Charles English Story of Ahikar', abbreviation: 'AHIKAR-EN',
    url: 'https://www.pseudepigrapha.com/pseudepigrapha/ahikar.htm', kind: 'pseudepigrapha-single-html', maxChapter: 1,
    language: 'en', originalLanguage: 'الآرامية مع صيغ سريانية وعربية', sourceType: 'public-domain-text',
    notes: 'نص إنجليزي تاريخي لقصة أخيقار وأمثاله؛ لا يقدم المصدر تقسيم فصول موحداً، لذا يحفظ النص الكامل في فصل واحد دون اختراع ترقيم.'
  },
  {
    bookCode: 'ZOSIMUS', slug: 'en-craigie-narrative-zosimus',
    nameAr: 'ترجمة كريغي الإنجليزية لرواية زوسيموس', nameEn: 'W. A. Craigie English Narrative of Zosimus', abbreviation: 'ZOSIMUS-EN',
    url: 'https://www.tertullian.org/fathers2/ANF-10/anf10-23.htm', kind: 'roman-html-chapters', maxChapter: 21,
    language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'ترجمة و. أ. كريغي في آباء ما قبل نيقية، المجلد العاشر؛ تحفظ الفصول الرومانية الـ21 وتعرض بوصفها رواية رؤيوية عن أرض المباركين.'
  },
  {
    bookCode: 'SEDRACH', slug: 'en-rutherford-apocalypse-sedrach',
    nameAr: 'ترجمة رذرفورد الإنجليزية لرؤيا سدراخ', nameEn: 'Andrew Rutherford English Apocalypse of Sedrach', abbreviation: 'SEDRACH-EN',
    url: 'https://www.tertullian.org/fathers2/ANF-10/anf10-17.htm', kind: 'roman-html-chapters', maxChapter: 16,
    language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'ترجمة أندرو رذرفورد المنشورة ضمن آباء ما قبل نيقية؛ تحفظ أقسام النص الستة عشر، وهو عمل مسيحي متأخر لا سفر قانوني.'
  },
  {
    bookCode: 'RESEZ', slug: 'en-anf-word-revelation-esdras',
    nameAr: 'النص الإنجليزي لكلمة ورؤيا عزرا', nameEn: 'English Word and Revelation of Esdras', abbreviation: 'RESEZ-EN',
    url: 'https://www.tertullian.org/fathers2/ANF-08/anf08-106.htm', kind: 'pseudepigrapha-single-html', maxChapter: 1,
    language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'نص قصير من مجموعة آباء ما قبل نيقية، محفوظ كوحدة واحدة لأن الطبعة لا تقسمه إلى فصول؛ مستقل عن عزرا الثاني ورؤيا عزرا اليونانية.'
  },
  {
    bookCode: 'VIRGINAP', slug: 'en-rutherford-apocalypse-virgin',
    nameAr: 'ترجمة رذرفورد الإنجليزية لرؤيا العذراء', nameEn: 'Andrew Rutherford English Apocalypse of the Virgin', abbreviation: 'VIRGINAP-EN',
    url: 'https://www.newadvent.org/fathers/1005.htm', kind: 'new-advent-numbered-sections-html', maxChapter: 1,
    language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text',
    notes: 'ترجمة أندرو رذرفورد المنشورة سنة ١٨٩٦ في آباء ما قبل نيقية، المجلد ٩؛ النص الكامل مقسم إلى ٣٠ فقرة مرقمة ويحفظ كسجل فصل واحد.'
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

function numberToRoman(value) {
  const digits = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remaining = value;
  let result = '';
  for (const [number, symbol] of digits) {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
  }
  return result;
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
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&aelig;/g, 'æ')
    .replace(/&AElig;/g, 'Æ')
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

async function parseErtaleChapteredHtml(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    if (source.skipChapters?.includes(chapter)) {
      console.warn(`[Bible noncanonical import] جرى تجاوز الإصحاح ${chapter} في ${source.slug}: المصدر يعرض نصاً تالِفاً.`);
      continue;
    }
    const url = source.url.replace('{chapter}', String(chapter));
    const content = await fetchText(url);
    const body = content.match(/<div\s+class="verses"[^>]*>([\s\S]*?)<\/div>\s*<\/main>/i)?.[1] || content;
    const units = [...body.matchAll(/<div\s+class="verse"[^>]*>[\s\S]*?<span\s+class="verse-num"[^>]*>(\d+)<\/span>[\s\S]*?<span\s+class="verse-text"[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((match) => ({ chapter, verse: Number(match[1]), text: stripHtml(match[2]), sourceUrl: url }))
      .filter((row) => row.text.length > 20);
    if (!units.length) throw new Error(`لم تُكتشف وحدات الإصحاح ${chapter} في ${source.slug}`);
    chapters.push(...units);
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

async function parseWikisourceJasherChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const page = `Sefer_Ha-yashar,_or,_the_Book_of_Jasher_(1840)/Chapter_${chapter}`;
    const url = `https://en.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&origin=*`;
    const content = await fetchText(url);
    let payload;
    try { payload = JSON.parse(content); } catch { throw new Error(`استجابة ويكي مصدر غير صالحة للفصل ${chapter}`); }
    const html = payload?.parse?.text?.['*'];
    if (!html) throw new Error(`لم يُعثر على نص الفصل ${chapter} في ${source.slug}`);
    const rows = [...html.matchAll(/<span class="wst-verse[^\"]*" id="[^"]+"><sup>(\d+)<\/sup><\/span>([\s\S]*?)<\/p>/gi)]
      .map((match) => ({ chapter, verse: Number(match[1]), text: stripHtml(match[2]), sourceUrl: url }))
      .filter((row) => row.text.length > 10);
    if (!rows.length) throw new Error(`لم تُكتشف وحدات الفصل ${chapter} في ${source.slug}`);
    chapters.push(...rows);
  }
  return chapters;
}

async function parseDiatessaronWikisource(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const roman = numberToRoman(chapter);
    const page = `Ante-Nicene Fathers/Volume IX/The Diatessaron of Tatian/The Diatessaron/Section_${roman}`;
    const content = await fetchText(wikisourceApiUrl(page));
    let payload;
    try {
      payload = JSON.parse(content);
    } catch {
      throw new Error(`استجابة ويكي مصدر ليست بصيغة JSON في ${source.slug}، القسم ${chapter}`);
    }
    const raw = payload?.parse?.wikitext?.['*'];
    if (!raw) throw new Error(`لم يُعثر على نص القسم ${chapter} في ${source.slug}`);
    const marker = `[Section ${roman}]`;
    const sectionStart = raw.indexOf(marker);
    const section = raw.slice(sectionStart >= 0 ? sectionStart + marker.length : 0);
    const markers = [...section.matchAll(/(?:^|\s)\[(\d+)\](?=\s|<ref|$)/g)];
    const rows = markers.map((match, index) => {
      const end = markers[index + 1]?.index ?? section.length;
      const text = stripWikisourceMarkup(section.slice(match.index + match[0].length, end).replace(/\[Arabic,\s*p\.\s*\d+\]/gi, ' '));
      return { chapter, verse: Number(match[1]), text, sourceUrl: wikisourceApiUrl(page) };
    }).filter((row) => row.text.length > 20);
    if (!rows.length) throw new Error(`لم تُكتشف وحدات القسم ${chapter} في ${source.slug}`);
    chapters.push(...rows);
  }
  return chapters;
}

export function parseOdesSolomonWikisource(content, source) {
  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error(`استجابة ويكي مصدر ليست بصيغة JSON في ${source.slug}`);
  }
  const wikitext = payload?.parse?.wikitext?.['*'];
  if (!wikitext) throw new Error(`لم يُعثر على النص في ${source.slug}`);

  const chapters = [];
  const sections = wikitext.split(/\{\{header\s*/i).slice(1);
  for (const section of sections) {
    const chapterMatch = section.match(/title=[^\n]*\bOde\s+(\d+)/i) || section.match(/section\s*=\s*Ode\s+(\d+)/i);
    const chapter = Number(chapterMatch?.[1]);
    if (!chapter || chapter > source.maxChapter) continue;
    let body = section;
    const witnessHeading = source.witness === 'syriac' ? 'Syriac text' : 'Coptic text';
    const witnessIndex = body.search(new RegExp(`==${witnessHeading}==`, 'i'));
    const fallbackIndex = source.witness === 'syriac' ? body.search(/==\s*Coptic text\s*==/i) : -1;
    if (witnessIndex >= 0) body = body.slice(witnessIndex + witnessHeading.length + 4);
    else if (fallbackIndex >= 0) body = body.slice(fallbackIndex + 'Coptic text'.length + 4);
    else if (/==\s*(?:Coptic|Syriac) text\s*==/i.test(body)) body = body.slice(0, body.search(/==\s*(?:Coptic|Syriac) text\s*==/i));
    const parseRows = (value) => [...value.matchAll(/\{\{verse\|(?:chapter=\d+\|)?verse=(\d+)\}\}\s*([\s\S]*?)(?=\n\s*:?\{\{verse\||\n\s*==|$)/gi)]
      .map((match) => ({ chapter, verse: Number(match[1]), text: stripWikisourceMarkup(match[2].replace(/^:+\s*/gm, ' ')), sourceUrl: 'https://en.wikisource.org/wiki/User:Nebulousquasar/Odes_of_Solomon' }))
      .filter((row) => row.text.length > 2);
    const rows = parseRows(body).length ? parseRows(body) : parseRows(section);
    if (!rows.length) throw new Error(`لم تُكتشف وحدات الأود ${chapter} في ${source.slug}`);
    chapters.push(...rows);
  }
  const seen = new Set(chapters.map((row) => row.chapter));
  if (seen.size !== source.maxChapter) throw new Error(`اكتُشفت ${seen.size} أود فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
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

function parsePseudepigraphaHdfColumnChapters(content, source) {
  const headings = [...content.matchAll(/HDF_CHAPTER_(\d+)"[^>]*>Chapter/gi)].map((match) => ({
    chapter: Number(match[1]),
    index: match.index
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.index, end);
    let verse = 0;
    for (const match of section.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)) {
      const cell = match[1];
      const verseMarker = cell.match(/HDF_CHAPTER_\d+__VERSE__?(\d+)/i);
      if (!verseMarker) continue;
      const anchorEnd = cell.indexOf('</A>', verseMarker.index) + 4;
      const text = stripHtml(cell.slice(anchorEnd));
      if (text.length <= 2) continue;
      verse += 1;
      chapters.push({ chapter: heading.chapter, verse, text, sourceUrl: source.url });
    }
    if (!verse) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
  }
  return chapters;
}

function parseFirmamentJosephAsenethChapters(content, source) {
  const headings = [...content.matchAll(/<h2\b[^>]*id="h-chapter-(\d+)"[^>]*>\s*Chapter\s+\d+\s*<\/h2>/gi)].map((match) => ({
    chapter: Number(match[1]),
    index: match.index
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.index, end);
    const units = [...section.matchAll(new RegExp(`\\b${heading.chapter}:(\\d+)\\s+([“\\\"])([\\s\\S]*?)(?:[”\\\"])(?=<br\\s*/?>|<\\/p>)`, 'gi'))];
    if (!units.length) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    for (const unit of units) {
      const text = stripHtml(unit[3]);
      if (text.length <= 2) continue;
      chapters.push({ chapter: heading.chapter, verse: Number(unit[1]), text, sourceUrl: source.url });
    }
  }
  return chapters;
}

function parseVitaAdaeEveChapters(content, source) {
  const headings = [...content.matchAll(/en-vaee-(\d+)/gi)].map((match) => ({
    chapter: Number(match[1]),
    index: match.index
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.index, end);
    let verse = 0;
    const units = [...section.matchAll(/<td\b[^>]*>\s*(\d+)\s*<\/td>\s*<td\b[^>]*>/gi)];
    for (const [unitIndex, unit] of units.entries()) {
      const unitEnd = units[unitIndex + 1]?.index ?? section.length;
      let textHtml = section.slice(unit.index + unit[0].length, unitEnd);
      const rowEnd = textHtml.search(/<\/tr\s*>/i);
      if (rowEnd >= 0) textHtml = textHtml.slice(0, rowEnd);
      textHtml = textHtml.replace(/(?:&lt;)?\/td&gt;\s*(?:<br\s*\/?>)?\s*$/i, '');
      const text = stripHtml(textHtml);
      if (text.length <= 2) throw new Error(`نص الوحدة ${heading.chapter}:${verse + 1} فارغ في ${source.slug}`);
      verse += 1;
      chapters.push({ chapter: heading.chapter, verse, text, sourceUrl: source.url });
    }
    if (verse === 0) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
  }
  if (source.expectedUnits && chapters.length !== source.expectedUnits) {
    throw new Error(`اكتُشفت ${chapters.length} وحدة في ${source.slug}، والمتوقع ${source.expectedUnits}`);
  }
  return chapters;
}

function parsePseudepigraphaSingleHtml(content, source) {
  const body = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || content;
  const text = stripHtml(body.replace(/^[\s\S]*?<\/b>/i, ''));
  if (text.length < 1000) throw new Error(`لم يُكتشف نص كافٍ في ${source.slug}`);
  return [{ chapter: 1, verse: 1, text, sourceUrl: source.url }];
}

function parseNewAdventNumberedSections(content, source) {
  const body = content.split(/<h[1-6]\b[^>]*>\s*About this page\s*<\/h[1-6]>/i)[0];
  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  const sections = [];
  let current = null;
  for (const paragraph of paragraphs) {
    const html = paragraph[1];
    const plain = stripHtml(html);
    if (/^(?:About this page|Contact information|CONTACT US\b)/i.test(plain)) break;
    const heading = plain.match(/^(\d{1,2})\.\s*(.*)$/);
    if (heading && Number(heading[1]) === (current ? current.number + 1 : sections.length + 1)) {
      if (current) sections.push(current);
      current = { number: Number(heading[1]), text: heading[2] };
    } else if (current) {
      const text = stripHtml(html);
      if (text) current.text = `${current.text} ${text}`.trim();
    }
  }
  if (current) sections.push(current);
  const expected = source.maxUnits || 30;
  if (sections.length !== expected || sections.some((section, index) => section.number !== index + 1 || section.text.length < 20)) {
    throw new Error(`اكتُشفت ${sections.length} أقسام مرقمة فقط في ${source.slug}، والمتوقع ${expected}`);
  }
  return sections.map((section) => ({ chapter: source.asChapters ? section.number : 1, verse: source.asChapters ? 1 : section.number, text: section.text, sourceUrl: source.url }));
}

function parseApocalypseMosesHtml(content, source) {
  const headings = [...content.matchAll(/\b([ivxlcdm]+)\s+1(?:,\d+)?\s+/gi)]
    .map((match) => ({ chapter: romanToNumber(match[1].toUpperCase()), index: match.index, start: match.index + match[0].length }));
  const chapterNumbers = new Set(headings.map((heading) => heading.chapter));
  if (headings.length !== source.maxChapter || chapterNumbers.size !== source.maxChapter) {
    throw new Error(`اكتُشفت ${chapterNumbers.size} إصحاحات فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const rows = [];
  for (const [index, heading] of headings.entries()) {
    const section = content.slice(heading.start, headings[index + 1]?.index ?? content.length)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    let verse = 1;
    const firstText = section.shift()?.replace(/^1\s+/, '').trim();
    if (firstText) rows.push({ chapter: heading.chapter, verse: verse++, text: firstText, sourceUrl: source.url });
    for (const line of section) {
      const numbered = line.match(/^(\d{1,2})\s+(.+)$/);
      if (numbered) {
        verse = Number(numbered[1]);
        rows.push({ chapter: heading.chapter, verse, text: numbered[2], sourceUrl: source.url });
      } else if (rows.at(-1)?.chapter === heading.chapter) {
        rows.at(-1).text += ` ${line}`;
      }
    }
    if (!rows.some((row) => row.chapter === heading.chapter)) {
      throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    }
  }
  return rows;
}

function parseRenderedWikisourceCollectionBook(content, source, chapter, page, pageUrl) {
  const lines = [...content.matchAll(/<span\b[^>]*class="[^"]*ws-poem-line[^"]*"[^>]*>([\s\S]*?)(?=<span\b[^>]*class="[^"]*ws-poem-break|<span\b[^>]*class="[^"]*ws-poem-line|<\/div>)/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length > 1);
  if (!lines.length) throw new Error(`لم تُكتشف أسطر الكتاب ${page} في ${source.slug}`);
  return { chapter, verse: 1, text: lines.join(' '), sourceUrl: pageUrl };
}

async function parseRenderedWikisourceCollectionChapters(source) {
  const chapters = [];
  for (const [index, book] of source.pages.entries()) {
    const page = `The Sibylline Oracles (Terry, 2nd edition)/Book ${book}`;
    const pageUrl = `https://en.wikisource.org/wiki/${page.replaceAll(' ', '_')}`;
    const content = await fetchText(pageUrl);
    chapters.push(parseRenderedWikisourceCollectionBook(content, source, index + 1, `الكتاب ${book}`, pageUrl));
  }
  return chapters;
}

function parseApocryphonEzekielFragments(content, source) {
  const headings = [...content.matchAll(/Fragment\s+(1|Two|Three|Four|Five):/gi)].map((match) => ({
    label: match[1],
    index: match.index
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${headings.length} شواهد فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.index, end);
    let verse = 0;
    for (const row of section.matchAll(/<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)) {
      const text = stripHtml(row[2]);
      if (text.length <= 8) continue;
      verse += 1;
      chapters.push({ chapter: index + 1, verse, text, sourceUrl: source.url });
    }
    if (!verse) throw new Error(`لم تُكتشف وحدات الشاهد ${index + 1} في ${source.slug}`);
  }
  return chapters;
}

function parseOtherGospelsJson(content, source) {
  let payload;
  try {
    payload = JSON.parse(content);
  } catch (error) {
    throw new Error(`تعذر تحليل ملف JSON في ${source.slug}: ${error.message}`);
  }
  if (!Array.isArray(payload.chapters) || payload.chapters.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${payload.chapters?.length || 0} أقسام فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, chapter] of payload.chapters.entries()) {
    const body = Array.isArray(chapter.body) ? chapter.body : [];
    let verse = 0;
    for (const rawLine of body) {
      const text = stripHtml(String(rawLine)
        .replace(/<center>[\s\S]*?<\/center>/gi, ' ')
        .replace(/\*\*\d+\.\*\*/g, ' '));
      if (!text || text.startsWith('[「') || text.length <= 8) continue;
      verse += 1;
      chapters.push({ chapter: index + 1, verse, text, sourceUrl: source.url });
    }
    if (!verse) throw new Error(`لم تُكتشف وحدات القسم ${index + 1} في ${source.slug}`);
  }
  return chapters;
}

function parseTestamentSolomonWikisource(content, source) {
  const start = content.indexOf('Of the sage Solomon.');
  const end = content.indexOf('mw-references-wrap', start);
  const section = content.slice(start >= 0 ? start : 0, end > start ? end : content.length);
  const paragraphs = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length > 8 && !/^Greek title/i.test(text));
  if (!paragraphs.length) throw new Error(`لم تُكتشف فقرات النص في ${source.slug}`);
  return paragraphs.map((text, index) => ({ chapter: 1, verse: index + 1, text, sourceUrl: source.url }));
}

function parseChapteredHtml(content, source) {
  const headings = [...content.matchAll(/<h[1-6][^>]*>\s*CHAPTER\s+(\d+)\s*<\/h[1-6]>/gi)]
    .map((match) => ({ chapter: Number(match[1]), index: match.index, start: match.index + match[0].length }))
    .filter((heading) => heading.chapter >= 1 && heading.chapter <= source.maxChapter);
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${headings.length} إصحاحات فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    for (const match of section.matchAll(/<p\b[^>]*>\s*(\d+):(\d+)\s+([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(match[3]);
      if (text.length > 2) chapters.push({ chapter: heading.chapter, verse: Number(match[2]), text, sourceUrl: source.url });
    }
    if (!chapters.some((row) => row.chapter === heading.chapter)) {
      throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    }
  }
  return chapters;
}

function parseChapteredParagraphHtml(content, source) {
  const headings = [...content.matchAll(/<h[1-6][^>]*id=["']CHAPTER_(\d+)["'][^>]*>[\s\S]*?<\/h[1-6]>/gi)]
    .map((match) => ({ chapter: Number(match[1]), index: match.index, start: match.index + match[0].length }))
    .filter((heading) => heading.chapter >= 1 && heading.chapter <= source.maxChapter);
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${headings.length} إصحاحات فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    for (const match of section.matchAll(/<p\b[^>]*>[\s\S]*?<b\b[^>]*>\s*(\d+):(\d+)\s*<\/b>[\s\S]*?([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(match[0].replace(/^[\s\S]*?<\/b>/i, '').replace(/<\/p>[\s\S]*$/i, ''));
      if (text.length > 2) chapters.push({ chapter: heading.chapter, verse: Number(match[2]), text, sourceUrl: source.url });
    }
    if (!chapters.some((row) => row.chapter === heading.chapter)) {
      throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
    }
  }
  return chapters;
}

function parseWikisourceRomanChapterHtml(content, source) {
  const headings = [...content.matchAll(/<p\b[^>]*>\s*CHAPTER\s+([IVXLCDM]+)\.?\s*<\/p>/gi)]
    .map((match) => ({ chapter: romanToNumber(match[1].replace(/l/g, 'I').toUpperCase()), index: match.index, start: match.index + match[0].length }))
    .filter((heading) => heading.chapter >= 1 && heading.chapter <= source.maxChapter);
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشفت ${headings.length} إصحاحات فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    let verse = 0;
    for (const match of section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(match[1]);
      if (text.length <= 8 || /^CHAPTER\s+/i.test(text)) continue;
      verse += 1;
      chapters.push({ chapter: heading.chapter, verse, text, sourceUrl: source.url });
    }
    if (!verse) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
  }
  return chapters;
}

function parseThomasSayingsHtml(content, source) {
  const rows = [...content.matchAll(/<p\b[^>]*>\s*\((\d+)\)\s*([\s\S]*?)<\/p>/gi)]
    .map((match) => ({ chapter: 1, verse: Number(match[1]), text: stripHtml(match[2]), sourceUrl: source.url }))
    .filter((row) => row.text.length > 8);
  if (rows.length !== source.maxUnits) {
    throw new Error(`اكتُشفت ${rows.length} أقوال فقط في ${source.slug}، والمتوقع ${source.maxUnits}`);
  }
  return rows;
}

function parseEarlyChristianGospelMaryHtml(content, source) {
  const headings = [...content.matchAll(/<h4\b[^>]*>[\s\S]*?Chapter\s+(\d+)\s*:?[\s\S]*?<\/h4>/gi)]
    .map((match) => ({ chapter: Number(match[1]), index: match.index, start: match.index + match[0].length }))
    .filter((heading) => source.chapterLabels.includes(heading.chapter));
  if (headings.length !== source.chapterLabels.length) {
    throw new Error(`اكتُشفت ${headings.length} أقسام فقط في ${source.slug}، والمتوقع ${source.chapterLabels.length}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    for (const match of section.matchAll(/<p\b[^>]*>\s*(\d+)\)\s*([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(match[2]);
      if (text.length > 8) chapters.push({ chapter: heading.chapter, verse: Number(match[1]), text, sourceUrl: source.url });
    }
    if (!chapters.some((row) => row.chapter === heading.chapter)) {
      throw new Error(`لم تُكتشف وحدات القسم ${heading.chapter} في ${source.slug}`);
    }
  }
  return chapters;
}

function parseEarlyChristianFragmentHtml(content, source) {
  const start = content.toUpperCase().indexOf(source.startMarker.toUpperCase());
  if (start < 0) throw new Error(`لم يُعثر على بداية الشاهد في ${source.slug}`);
  const text = stripHtml(content.slice(start));
  if (text.length < 500) throw new Error(`لم يُكتشف نص كافٍ في ${source.slug}`);
  return [{ chapter: 1, verse: 1, text, sourceUrl: source.url }];
}

function parseGospelsNetParagraphHtml(content, source) {
  const start = content.indexOf('<strong>Introduction</strong>');
  const end = content.indexOf('<strong>Notes on Translation</strong>', start);
  if (start < 0 || end <= start) throw new Error(`لم يُعثر على نطاق النص في ${source.slug}`);
  const rows = [...content.slice(start, end).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length > 8 && !/^Introduction$/i.test(text) && !/^The Gospel of Judas$/i.test(text));
  if (rows.length !== source.maxUnits) {
    throw new Error(`اكتُشفت ${rows.length} وحدة فقط في ${source.slug}، والمتوقع ${source.maxUnits}`);
  }
  return rows.map((text, index) => ({ chapter: 1, verse: index + 1, text, sourceUrl: source.url }));
}

function parseNewAdventChapteredHtml(content, source) {
  const headings = [...content.matchAll(/<h[1-6]\b[^>]*?(?:id=["']chapter(\d+)["'])?[^>]*>\s*Chapter\s+(\d+)\b[\s\S]*?<\/h[1-6]>/gi)]
    .map((match) => ({ chapter: Number(match[1] || match[2]), index: match.index, start: match.index + match[0].length }))
    .filter((heading) => heading.chapter >= 1 && heading.chapter <= source.maxChapter);
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} فصلاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    const text = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => stripHtml(match[1]))
      .filter((paragraph) => paragraph.length > 8)
      .join('\n\n');
    if (text.length < 40) throw new Error(`لم يُكتشف نص كافٍ للفصل ${heading.chapter} في ${source.slug}`);
    return { chapter: source.renumberChapters ? index + 1 : heading.chapter, verse: 1, text, sourceUrl: source.url };
  });
}

function parseWikisourceNumberedParagraphs(content, source) {
  const start = content.indexOf('The Birth of Mary the Holy');
  const section = content.slice(start >= 0 ? start : 0);
  const rows = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]).match(/^\s*(\d+)\.\s+([\s\S]+)$/))
    .filter(Boolean)
    .map((match) => ({ chapter: Number(match[1]), verse: 1, text: match[2], sourceUrl: source.url }))
    .filter((row) => row.chapter >= 1 && row.chapter <= source.maxChapter && row.text.length > 8);
  const chapters = new Map(rows.map((row) => [row.chapter, row]));
  if (chapters.size !== source.maxChapter) {
    throw new Error(`اكتُشفت ${chapters.size} مقاطع فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return [...chapters.values()].sort((a, b) => a.chapter - b.chapter);
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

function parseWesleyTestamentChapters(content, source) {
  const headings = [...content.matchAll(/Chapter\s+(\d+)/gi)].map((match) => ({
    chapter: Number(match[1]),
    index: match.index,
    start: match.index + match[0].length,
  }));
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const [index, heading] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    const section = content.slice(heading.start, end);
    let verse = 0;
    for (const paragraph of section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(paragraph[1]);
      const markers = [...text.matchAll(/(?:^|\s)(\d{1,3})[.]?\s+/g)];
      for (const [markerIndex, marker] of markers.entries()) {
        const start = marker.index + marker[0].length;
        const nextStart = markers[markerIndex + 1]?.index;
        const unit = text.slice(start, nextStart).trim();
        if (unit.length <= 2) continue;
        verse += 1;
        chapters.push({ chapter: heading.chapter, verse, text: unit, sourceUrl: source.url });
      }
    }
    if (!verse) throw new Error(`لم تُكتشف وحدات الإصحاح ${heading.chapter} في ${source.slug}`);
  }
  return chapters;
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

const TESTAMENT_ADAM_OCP_URL = 'https://raw.githubusercontent.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/master/static/docs/TAdam.xml';
const OCP_RAW_BASE = 'https://raw.githubusercontent.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/master/static/docs/';
const BALAAM_DEIR_ALLA_LOCATIONS = [
  ...Array.from({ length: 16 }, (_, index) => [1, index + 1]),
  ...Array.from({ length: 17 }, (_, index) => [2, index + 2]),
];
const APDAN_GREEK_UNIT_LOCATIONS = [
  [1, 1, 4], [1, 9, 17], [2, 1, 17], [3, 1, 10], [3, 12, 14], [4, 1, 12], [4, 14, 18],
  [5, 1, 4], [5, 8, 11], [6, 2, 2], [6, 4, 6], [6, 11, 14], [7, 1, 7], [8, 1, 27],
  [9, 1, 7], [10, 1, 11], [11, 1, 13], [12, 1, 13], [13, 1, 16],
].flatMap(([chapter, start, end]) => Array.from({ length: end - start + 1 }, (_, index) => [chapter, start + index]));

const QUMRAN_AMRAM_WITNESS_DATA = [
  { witness: '4Q543', version: '2026-10-06', lineCounts: [10,9,3,4,9,2,2,1,2,4,4,5,3,3,3,2,3,3,3,2,3,2,3,2,3,2,5,2,3,2,2,2,2,1,1,1,2,1,1,2,1,3], words: 955, sha256: 'dee9f3c2aa156cac58d83986649a1058cb13788b884e567070218435a532ff00' },
  { witness: '4Q544', version: '2026-10-06', lineCounts: [15,6,3], words: 417, sha256: '8511456ecfcb3be83cd262235f76f2cbbced5da37badec2b4c6653cb246fc121' },
  { witness: '4Q545', version: '2026-05-21', lineCounts: [19,16,3,4,7,5,4,2,3,7,2,2,2], words: 688, sha256: '7aca030b9dd5bb203ee56cee442a4b89922c147912da968dccef4adba1f58e77' },
  { witness: '4Q546', version: '2026-10-06', lineCounts: [4,4,5,4,3,3,6,5,7,1,6,8,5,5,6,4,5,2,2,2,2,2,3,1,2,2,4], words: 814, sha256: 'd64f1284eb40d5239a18a76e2abe365f27967ae7e6964538c44f759621446c0a' },
  { witness: '4Q547', version: '2026-10-06', lineCounts: [13,7,5,3,4,5,5,6,12], words: 593, sha256: '2d0858e24fcaec937541dba0d26db4207c877ec04f0e23b2c799eb0594f1854b' },
  { witness: '4Q548', version: '2026-10-06', lineCounts: [3,16,4], words: 254, sha256: 'fbf262569d483ce97bb1a99e8f18b25ed317e9c3c8844230c5173545878664fb' },
  { witness: '4Q549', version: '2026-10-06', lineCounts: [3,11], words: 129, sha256: 'b8a4f65ed7afb6fd9774d66b91168d629cb1b26b706744fdf5a4a5974fca1f47' }
];

const QUMRAN_AMRAM_SOURCES = QUMRAN_AMRAM_WITNESS_DATA.map((witness) => {
  const url = `https://lexicon.qumran-digital.org/transcriptions/${witness.witness}/${witness.version}/index.html`;
  return {
    bookCode: 'AMRAM', slug: `arc-qdr-visions-amram-${witness.witness.toLowerCase()}-2026`,
    nameAr: `الشاهد الآرامي لمخطوط ${witness.witness} من رؤى عمرام`,
    nameEn: `Qumran Digital ${witness.witness} Visions of Amram`,
    abbreviation: `AMRAM-${witness.witness}`,
    url, kind: 'reviewed-unit-text-file',
    textFile: new URL(`./data/visions_amram_${witness.witness.toLowerCase()}_2026.json`, import.meta.url),
    expectedSha256: witness.sha256,
    expectedUnitCount: witness.lineCounts.reduce((sum, count) => sum + count, 0),
    expectedWordCount: witness.words,
    expectedChapterVerseNumbers: witness.lineCounts.map((count) => Array.from({ length: count }, (_, index) => index + 1)),
    maxChapter: witness.lineCounts.length, incomplete: true,
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: `تفريغ ${witness.lineCounts.reduce((sum, count) => sum + count, 0)} سطراً آرامياً من مخطوط ${witness.witness} في رؤى عمرام، من إصدار ${witness.version} لمشروع قمران الرقمي، المرخص برخصة المشاع الإبداعي النسب بالمثل ٤٫٠. كل وحدة سطر واحد مرتبط مباشرة بمعرّفه في المصدر، ومجموعات العرض ليست فصولاً أصلية. هذا شاهد مخطوط مستقل ومجزأ؛ لا يدمج مع المخطوطات الأخرى ولا يمثل النص كاملاً. [التفريغ والرخصة](${url})`
  };
});

const GENESIS_APOCRYPHON_TEXT_FILE = new URL('./data/genesis_apocryphon_1q20_qumran_digital_2026.json', import.meta.url);
const GENESIS_APOCRYPHON_EXPECTED_LOCATIONS = JSON.parse(readFileSync(GENESIS_APOCRYPHON_TEXT_FILE, 'utf8'))
  .map(({ chapter, verse }) => [chapter, verse]);

export const ADDITIONAL_SOURCES = [
  {
    bookCode: 'GIANTS', slug: 'en-jewishmythology-4q531-2026',
    nameAr: 'ترجمة إنجليزية تجريبية لشذرات ٤ق٥٣١ من سفر العمالقة',
    nameEn: 'JewishMythology Beta English Translation of Book of Giants 4Q531 Excerpts',
    abbreviation: 'GIANTS-4Q531-EN',
    url: 'https://jewishmythology.com/myths/mahaway-flew-beyond-the-firmament-to-beg-enoch-for-mercy',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/giants_jewishmythology_english_2026.json', import.meta.url),
    expectedSha256: 'ca858556e38f7cc7e1ee710b5aa1cb91c8c37c272d217bf03f23c7846bacf986',
    expectedUnitCount: 2, expectedWordCount: 126, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'ترجمة إنجليزية تجريبية معلنة (Beta) لمقطعين فقط من الشاهد 4Q531: الشظية 1، الأسطر 1–8، والشظيتان 2+3، الأسطر 1–10. ليست ترجمة لسفر العمالقة كاملاً ولا تغطي شواهده الأخرى. صفحة المصدر تنسب النص الآرامي إلى تفريغ قمران الرقمي (CC-BY-SA 4.0)، وتعلن صراحة أن الترجمة التجريبية مشتقة ومرخصة أيضاً برخصة CC-BY-SA 4.0؛ حُفظت الأقواس وعلامات الحذف كما في المصدر. [النص والترجمة والرخصة](https://jewishmythology.com/myths/mahaway-flew-beyond-the-firmament-to-beg-enoch-for-mercy)؛ [بيان الرخصة](https://jewishmythology.com/about).'
  },
  {
    bookCode: 'GIANTS', slug: 'arc-qdr-book-giants-2026',
    nameAr: 'تفريغ آرامي مرخص لشواهد قمرانية من سفر العمالقة',
    nameEn: 'Qumran-Digital Aramaic Book of Giants Manuscript Lines',
    abbreviation: 'GIANTS-QDR-ARC',
    url: 'https://lexicon.qumran-digital.org/transcription-index/latest/index.html',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/giants_qdr_aramaic_2026.json', import.meta.url),
    expectedSha256: '8672a461903f749a9366b7c46e3a6925e5c6cad985a72408221916c745c91d65',
    expectedUnitCount: 602, expectedWordCount: 3996, maxChapter: 1, incomplete: true,
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ٦٠٢ سطراً آرامياً مرخصاً برخصة CC-BY-SA 4.0 من صفحات قُمران الرقمي للشواهد 1Q23 و1Q24 و2Q26 و4Q203 و4Q530 و4Q531 و4Q532 و4Q533 و6Q8؛ كل وحدة سطر شاهد مستقل مع معرّف الشظية ورابط موضعه، ولا تمثل الأسطر متناً متصلاً أو ترتيباً قصصياً موحداً. نسبة 1Q24 و4Q533 إلى سفر العمالقة غير محسومة في بعض الفهارس، لذا أُبقيا شاهدين مرشحين منفصلين ولا يُحسم انتسابهما بهذا الإدراج. حُفظت رموز السقط وإعادة البناء كما في التفريغ. السفر كله جزئي؛ لا يُستكمل من ترجمة هننغ المانوية ذات الحقوق غير المحسومة. [فهرس التفريغات](https://lexicon.qumran-digital.org/transcription-index/latest/index.html)؛ [صفحة شاهد 4Q531 ورخصته](https://lexicon.qumran-digital.org/transcriptions/4Q531/2026-10-06/index.html?v=2026-10-06).'
  },
  {
    bookCode: 'BALAAM', slug: 'arc-deir-alla-balaam-2025',
    nameAr: 'تفريغ نقش بلعام بحروف عبرية (الآرامية القديمة)',
    nameEn: 'Deir Alla Balaam Inscription West Semitic Transcription',
    abbreviation: 'BALAAM-ARC',
    url: 'https://oriental-world.org.ua/index.php/journal/article/download/765/755/',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/balaam_deir_alla_2025_arc.json', import.meta.url),
    expectedSha256: '0a095e4c24ee4cfac06e81d662206f6f38e4c0fd952b2e86b129781c914fe8e7',
    expectedUnitCount: 33, expectedUnitLocations: BALAAM_DEIR_ALLA_LOCATIONS,
    expectedWordCount: 338, maxChapter: 2, incomplete: true,
    language: 'arc', originalLanguage: 'الآرامية أو لهجة كنعانية سامية شمالية غربية (التصنيف محل خلاف)',
    sourceType: 'cc-by-4.0', siteScope: 'both',
    notes: 'تفريغ إعادة بناء تركيبي الشاهدين الأول والثاني، ٣٣ سطراً محفوظاً/مستعاداً في دراسة دميترو تسولين وأناستاسيا أوريخوفا، «نقوش بلعام من دير علا» (عالم الشرق، ٢٠٢٥، العدد ١، ص ٩٧–١١٦، DOI: 10.15407/orientw2025.01.097). يعرض المصدر اللغة السامية الشمالية الغربية بحروف عبرية مربعة، لا بخط النقش الأصلي؛ ويتبع ترتيب هاكيت مع مواضع قليلة من قراءة ليفين. يبدأ التركيب الثاني من السطر ٢ لأن السطر ١ غير معروض/مفقود، وتحفظ الأقواس الفجوات وإعادات البناء. الدراسة مرخصة برخصة المشاع الإبداعي النسب ٤٫٠؛ ينسب التفريغ إلى المؤلفين والطبعة. لا يساوي هذا النص عملاً كاملاً: الشاهد مكسور، وتصنيف لغته وبعض قراءاته موضع خلاف. [الدراسة المفتوحة ونص الأسطر](https://oriental-world.org.ua/index.php/journal/article/download/765/755/)؛ [بيانات النشر](https://doi.org/10.15407/orientw2025.01.097).'
  },
  {
    bookCode: 'BALAAM', slug: 'ar-deir-alla-balaam-2025',
    nameAr: 'ترجمة عربية عن الترجمة الأوكرانية المشروحة لنقش بلعام',
    nameEn: 'Arabic Rendering from the Annotated Ukrainian Translation of the Deir Alla Balaam Inscription',
    abbreviation: 'BALAAM-AR',
    url: 'https://oriental-world.org.ua/index.php/journal/article/download/765/755/',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/balaam_deir_alla_2025_ar.json', import.meta.url),
    expectedSha256: 'bee1fc8ce5ec3fc08284ef4bfc2e5310894a7f7e8762fae77d7afac1519af298',
    expectedUnitCount: 33, expectedUnitLocations: BALAAM_DEIR_ALLA_LOCATIONS,
    expectedWordCount: 380, maxChapter: 2, incomplete: true,
    language: 'ar', originalLanguage: 'الآرامية القديمة؛ وسيط الترجمة أوكراني',
    sourceType: 'cc-by-4.0-derivative-translation', siteScope: 'both',
    notes: 'صياغة عربية للمقاطع المتاحة، أُعدت عن الترجمة الأوكرانية الحرفية والحرة في دراسة دميترو تسولين وأناستاسيا أوريخوفا، لا عن اللغة القديمة مباشرة. أبقينا الأسطر المفقودة ومواضع إعادة البناء والخلاف ظاهرة ولم نخترع نصاً للسقط. الدراسة الأصلية منشورة برخصة المشاع الإبداعي النسب ٤٫٠؛ ينسب العمل للمؤلفين والطبعة، وهذه الصياغة العربية ترجمة مشتقة من ترجمتهم الأوكرانية. [الدراسة المفتوحة والترجمة وتعليقات القراءة](https://oriental-world.org.ua/index.php/journal/article/download/765/755/)؛ [بيانات النشر](https://doi.org/10.15407/orientw2025.01.097).'
  },
  {
    bookCode: 'MOTA-MUSE', slug: 'gez-opensiddur-mota-muse-2019',
    nameAr: 'النص الجعزي لموتى موسى في مشروع السِّدور المفتوح',
    nameEn: 'Open Siddur Ge’ez Text of Mota Muse',
    abbreviation: 'MOTA-GEZ',
    url: 'https://opensiddur.org/readings-and-sourcetexts/readings/jewish-readings/shivah-badar-readings/mota-muse-the-book-of-the-passing-of-mosheh/',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/mota_muse_opensiddur_geez_2019.json', import.meta.url),
    expectedSha256: '4c0f02b092f37b2a8baac5ff0628bb600f7881e679b04614aa8f2b708ebd6df6',
    expectedUnitCount: 15, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    expectedWordCount: 2200, maxChapter: 1, incomplete: true,
    replaceExistingVerses: true,
    language: 'gez', originalLanguage: 'الجعزية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'نقلٌ للنص الجعزي كما يورده مشروع السِّدور المفتوح، مقسماً إلى ١٥ وحدة عرض متتابعة لا إلى أعداد قديمة. صفحة المشروع تنشر النص في ٢٦ تشرين الثاني ٢٠١٩ برخصة CC BY-SA 4.0 (المشاع الإبداعي النسب بالمثل ٤٫٠)، وتنسب الترجمة العبرية إلى جاك فايطلوفيتش (Jacques Faïtlovitch)، وتعرّف إسحاق غانتويرك ماير (Isaac Gantwerk Mayer) مترجماً إنجليزياً لهذا النص؛ ولا تعيّن مؤلف النص الأصلي. راجع الطبعة الإثيوبية المصورة لفايطلوفيتش سنة ١٩٠٦؛ وتصف مقدمتها مخطوط هذا الشاهد بأنه غير صحيح وغير كامل. لذلك السجل جزئي، ولا يستكمل مواضع مفقودة. عند إعادة الاستخدام: انسب النص إلى مشروع السِّدور المفتوح وفايطلوفيتش حيث تنطبق النسبة، أرفق رابط المصدر والرخصة، وصرّح بأن النص قُسم إلى وحدات عرض. [النص والرخصة](https://opensiddur.org/readings-and-sourcetexts/readings/jewish-readings/shivah-badar-readings/mota-muse-the-book-of-the-passing-of-mosheh/)؛ [الطبعة الإثيوبية المصورة ١٩٠٦](https://archive.org/details/motamuselamortdemoisejacquesfaitlovitch1906).'
  },
  {
    bookCode: 'MOTA-MUSE', slug: 'en-opensiddur-mota-muse-mayer-2019',
    nameAr: 'ترجمة ماير الإنجليزية لموتى موسى عن العبرية',
    nameEn: 'Isaac Gantwerk Mayer English Translation of Mota Muse via Hebrew',
    abbreviation: 'MOTA-EN',
    url: 'https://opensiddur.org/readings-and-sourcetexts/readings/jewish-readings/shivah-badar-readings/mota-muse-the-book-of-the-passing-of-mosheh/',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/mota_muse_opensiddur_english_2019.json', import.meta.url),
    expectedSha256: '8a66f4eedc98b2c4b095ea4ac2540a1e390a896a49b67160296c9dab51156b43',
    expectedUnitCount: 15, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    expectedWordCount: 2068, maxChapter: 1, incomplete: true,
    replaceExistingVerses: true,
    language: 'en', originalLanguage: 'الجعزية، بوسيط ترجمة فايطلوفيتش العبرية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'ترجمة إسحاق غانتويرك ماير (Isaac Gantwerk Mayer) الإنجليزية المنشورة في مشروع السِّدور المفتوح سنة ٢٠١٩؛ يذكر المشروع صراحة أنها مترجمة عن العبرية التي ترجمها جاك فايطلوفيتش (Jacques Faïtlovitch) عن الجعزية، وليست ترجمة إنجليزية مباشرة عن الجعزية. رُتبت فقرات الصفحة في ١٥ وحدة عرض، وأزيل شرح الحواشي من المتن مع إبقاء أرقام الإحالة؛ النص متاح برخصة CC BY-SA 4.0 (المشاع الإبداعي النسب بالمثل ٤٫٠)، ويجب حفظ النسبة والرابط والرخصة وبيان التقسيم. مقدمة طبعة فايطلوفيتش ١٩٠٦ تصف مخطوط الشاهد بأنه غير صحيح وغير كامل؛ لذا حالة هذا الشاهد جزئية ولا تُختلق خاتمة أو مادة مفقودة. [النص والرخصة وبيان سلسلة الترجمة](https://opensiddur.org/readings-and-sourcetexts/readings/jewish-readings/shivah-badar-readings/mota-muse-the-book-of-the-passing-of-mosheh/)؛ [الطبعة الإثيوبية المصورة ١٩٠٦](https://archive.org/details/motamuselamortdemoisejacquesfaitlovitch1906).'
  },
  {
    bookCode: 'SHEM', slug: 'en-mingana-book-shem-1917',
    nameAr: 'ترجمة منغانا الإنجليزية لكتاب سام بن نوح عن بداية السنة',
    nameEn: 'Alphonse Mingana English Translation of the Book of Shem, Son of Noah',
    abbreviation: 'SHEM-EN',
    url: 'https://archive.org/download/someearlyjudaeoc00ming/someearlyjudaeoc00ming.pdf',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/book_shem_mingana_1917.json', import.meta.url),
    expectedSha256: '3450158e81794a55582441519be0b7af0cb5bbf96fba8309a9195fd342f838aa',
    expectedUnitCount: 12, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    expectedWordCount: 1925, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'السريانية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة ألفونس منغانا الإنجليزية المنشورة سنة ١٩١٧ للنص الذي تسميه الطبعة «كتاب سام بن نوح»، في «وثائق يهودية مسيحية مبكرة من مكتبة جون رايلاندز»، الصفحات ٢٠–٢٩. يذكر المحقق أن شاهده المخطوط جون رايلاندز السرياني ٤٤ (وكان مرقماً ١٦٥)، وأنه لا يسبق القرن الخامس عشر، وأن نسخه رديء كثير السقط والاضطراب. فرغت الأقسام الاثني عشر المطبوعة بحسب البروج عن صفحات الطبعة ٢٤–٢٩، وقورنت بصور الصفحات؛ أبقيت مواضع الفقد بعلامة […] ولم أستكمل أي كلمة مفقودة. أشار بار إيلان في دراسة سنة ٢٠١٢ إلى أن نسبة هذا النص إلى سام قد تكون نتيجة خطأ ناسخ، وأنه ليس منحولاً؛ لذا يحفظ المشروع عنوان الطبعة ولا يحسم النسبة. الترجمة المنشورة في ١٩١٧ للباحث المتوفى سنة ١٩٣٧ ضمن الملك العام في الاتحاد الأوروبي؛ هذا سجل للترجمة الإنجليزية، وحالة الشاهد «جزئي» بسبب فجوات المخطوط والقراءات غير المحسومة. [الكتاب المصور وبيانات النشر](https://archive.org/details/someearlyjudaeoc00ming)؛ [دراسة بار إيلان](https://poj.peeters-leuven.be/content.php?id=3009275&journal_code=ARAM&url=article.php).'
  },
  {
    bookCode: 'SHEM', slug: 'syr-mingana-book-shem-1917',
    nameAr: 'التفريغ السرياني لكتاب سام بن نوح في طبعة منغانا',
    nameEn: 'Alphonse Mingana Syriac Text of the Book of Shem, Son of Noah', abbreviation: 'SHEM-SYR',
    url: 'https://biblicalstudies.org.uk/pdf/bjrl/004_059.pdf', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/book_shem_mingana_1917_syriac.json', import.meta.url),
    expectedSha256: 'b435849792385eacb733054436af97ca5af0f183296db75227a6955f896d5d61',
    expectedUnitCount: 8, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    expectedWordCount: 1073, maxChapter: 1, incomplete: true,
    language: 'syr', originalLanguage: 'السريانية (لغة الشاهد؛ الأصل التاريخي غير محسوم)', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'تفريغ آلي لمتن النص السرياني المطبوع في طبعة منغانا ١٩١٧، الصفحات ٥٢–٥٩، عن المخطوط الوحيد جون رايلاندز السرياني ٤٤، الورقات ٨١ب–٨٣ب؛ الحواشي النقدية غير مضمّنة. تمثل كل وحدة صفحة مطبوعة، لا إصحاحاً أو عدداً أصلياً. قورنت الصفحات المتكررة مع إعادة النشر في نشرة جون رايلاندز صفحةً صفحة؛ الصفحة المطبوعة ٥٨، المفقودة من صور النسخة الأولى، استعيدت من الصفحة ١١٤ في إعادة النشر وتطابقت محاولتا التعرّف بدقتين. لم تُملأ مواضع السقط، ولا يُعدّ هذا التفريغ نصاً نقدياً جديداً؛ تبقى حالة الشاهد جزئية بسبب عيوب المخطوط وبعض أخطاء القراءة التي لم تُحسم. ويرى بار إيلان في دراسة سنة ٢٠١٢ أن نسبة الكتاب إلى سام قائمة على خطأ ناسخ وأنه ليس منحولاً؛ يورد المشروع النسبة لأنها عنوان الطبعة لا حكماً عليها. [النص السرياني المعاد نشره](https://biblicalstudies.org.uk/pdf/bjrl/004_059.pdf)؛ [فهرس المخطوط الوحيد وصوره](https://www.digitalcollections.manchester.ac.uk/view/MS-SYRIAC-00044)؛ [دراسة بار إيلان](https://poj.peeters-leuven.be/content.php?id=3009275&journal_code=ARAM&url=article.php).'
  },
  {
    bookCode: 'SEVDAN', slug: 'en-project-seventh-vision-daniel',
    nameAr: 'ترجمة إنجليزية جديدة للرؤيا السابعة لدانيال عن الترجمة الألمانية التاريخية',
    nameEn: 'Project English Translation of Daniel’s Seventh Vision from the 1892 German Edition',
    abbreviation: 'SEVDAN-EN',
    url: 'https://archive.org/download/WienerZeitschriftFrDieKundeDesMorgenlandes/bd6.pdf',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/seventh_vision_daniel_project_translation.json', import.meta.url),
    expectedSha256: '64fa8bb27cb4fc5fa96276d104ea58fbc3e5071ecb5e04574a7a3776d3d0cfb1',
    expectedUnitCount: 14, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    expectedWordCount: 4506, maxChapter: 1, incomplete: false,
    language: 'en', originalLanguage: 'الأرمنية (بوسيط الترجمة الألمانية)', sourceType: 'project-translation', siteScope: 'both',
    notes: 'ترجمة إنجليزية جديدة أعدها المشروع عن ترجمة غريغوريس كاليمكيار الألمانية المنشورة سنة ١٨٩٢ في «دراسات في معرفة الشرق»، المجلد السادس، الصفحات المطبوعة ٢٢٧–٢٤٠. قُسم النص النثري المتتابع إلى ١٤ وحدة لتسهيل عرضه، وتغطي الصفحات المطبوعة المذكورة؛ ويصرح المصدر بخاتمة الصلاة وكلمة Amen. هذه ترجمة عن الألمانية وليست مباشرة عن الأرمنية، وتمثل هذا الشاهد فقط لا جميع روايات دانيال. أُبقيت علامتا المحقق على موضع القراءة الأرمنية غير المحسوم وكلمة الطريق التي علّمها بالشك. الترجمة الألمانية التاريخية للكاليمكيار (١٨٦٢–١٩١٧) ضمن الملك العام، والنص الإنجليزي ترجمة مشروع جديدة.'
  },
  {
    bookCode: 'QEZRA', slug: 'en-questions-ezra-arm-short',
    nameAr: 'ترجمة إنجليزية جديدة للرواية الأرمنية الأقصر من أسئلة عزرا',
    nameEn: 'Project English Translation of Armenian Questions of Ezra, Recension B',
    abbreviation: 'QEZRA-B-EN',
    importEligible: false,
    url: 'http://greenstone.flib.sci.am/gsdl/collect/armenian/Books/yasmavurq_1730/book/index.html',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/questions_ezra_arm_short_project_translation.json', import.meta.url),
    expectedSha256: '48cf41de7d5e36637e3e11b999a16be9521b32b745a756d6a160c062397d2a64',
    expectedUnitCount: 14, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    expectedWordCount: 309, maxChapter: 1, incomplete: false,
    language: 'en', originalLanguage: 'الأرمنية', sourceType: 'original-translation', siteScope: 'both',
    notes: 'مصدر هذه الترجمة هو تفريغ حديث يقابل ثلاثة شواهد أرمنية، وينسب حقوق النشر إلى ماتيناداران ومايكل ستون؛ لم يثبت إذن إعادة استخدام التفريغ أو ترجمة مبنية عليه. لذلك هذا السجل محفوظ محلياً لكنه معطل وغير مؤهل للاستيراد أو النشر. جُلبت صور الصفحتين ٤٢٤–٤٢٥ من طبعة «هايْسمَفورك» بالقسطنطينية ١٧٣٠ وفُحصتا؛ لا تزال الترجمة غير مفعلة لأن التفريغ الآلي للأرمنية المطبوعة أخفق في إنتاج نص دقيق، وحقوق التفريغ الحديث وترجمته غير محسومة. يلزم تفريغ متخصص أو ترجمة مستقلة موثوقة عن الطبعة القديمة. [التفريغ الحديث وإشعار الحقوق](https://arar.sci.am/Content/268347/MayqlStoun.pdf)؛ [سجل الطبعة المصورة لعام ١٧٣٠](http://greenstone.flib.sci.am/gsdl/cgi-bin/library.cgi?a=d&c=armenian&d=HASHd07852dab7379797248cf8).'
  },
  {
    bookCode: 'QEZRA', slug: 'en-issaverdens-questions-ezra-1901',
    nameAr: 'ترجمة إيسافردنس الإنجليزية الجزئية لأسئلة عزرا، الرواية الأرمنية الأطول',
    nameEn: 'James Issaverdens English Translation of Questions of Ezra, Recension A (Partial)',
    abbreviation: 'QEZRA-A-EN',
    url: 'https://archive.org/download/cu31924091353445/cu31924091353445.pdf',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/questions_ezra_issaverdens_1901.json', import.meta.url),
    expectedSha256: '0d4a25dc0472864c6ab6396bc75fd3039fd7ca945a0a78ace2582d71b5ebcf9f',
    expectedUnitCount: 6, expectedVerseNumbers: [1, 2, 3, 4, 5, 6],
    expectedWordCount: 1223, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'الأرمنية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة جايمس إيسافردنس الإنجليزية المنشورة سنة ١٩٠١، الصفحات المطبوعة ٦٩٧–٧٠٣، عن الرواية الأرمنية الأطول في مخطوط طقسي رقم ٥٧٠ المؤرخ سنة ١٢٠٨. فُرغ النص المنشور كاملاً إلى ست وحدات موضوعية وقورنت الصفحات المصورة؛ ينتهي النص في منتصف الكلام. يصرح المترجم بفقد ورقتين، واهتراء هوامش ست ورقات أخرى، وفقد بقية الأسئلة؛ لذلك الحالة جزئية، ولم يُستكمل المفقود. توفي المترجم سنة ١٩٠٢ بحسب فهرس المكتبة الرقمية الأرمنية، والترجمة ضمن الملك العام في الاتحاد الأوروبي. هذا سجل إنجليزي للرواية A؛ لا يتضمن بعد تفريغ الأصل الأرمني. [الكتاب المصور وبيانات طبعة ١٩٠١](https://archive.org/details/cu31924091353445)؛ [سيرة المترجم وبيان وفاته](https://digilib.aua.am/book/4850/5350/27803/ՆԱՄԱԿԱՆԻ?lang=am).'
  },
  {
    bookCode: 'TAISAAC', slug: 'en-box-gaselee-testament-isaac',
    nameAr: 'ترجمة غاسيل الإنجليزية لوصية إسحاق',
    nameEn: 'S. Gaselee English Testament of Isaac', abbreviation: 'TAISAAC-EN',
    url: 'https://gospelstudies.org.uk/earlychurch/pdf/e-books/box_g-h/testament-of-abraham_box.pdf', kind: 'reviewed-text-file',
    textFile: new URL('./data/testament_isaac_box_gaselee_1927.txt', import.meta.url),
    expectedSha256: '446d1af5512c8fd77edcc2622519b269736a50556d884251e1cdf24b707c9ea1',
    expectedWordCount: 4413, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'القبطية البحيرية', sourceType: 'public-domain-text',
    notes: 'ترجمة س. غاسيل لوصية إسحاق عن الشاهد القبطي البحيري في مخطوط الفاتيكان القبطي ٦١، ضمن كتاب ج. هـ. بوكس الصادر عن جمعية نشر المعرفة المسيحية سنة ١٩٢٧، الصفحات ٥٥–٧٥. سجل الكتاب الرقمي يعلن الطبعة ملكاً عاماً. أُفرغ متن الترجمة في الصفحات ٥٧–٧٥، وأضيفت ملاحظة منفصلة تلخص فجوات الشاهد التي يذكرها غاسيل، من دون استكمال الكلمات المفقودة. الحالة جزئية بسبب فجوات المصدر، لا بسبب نقص التفريغ.'
  },
  {
    bookCode: 'TAJACOB', slug: 'en-box-gaselee-testament-jacob',
    nameAr: 'ترجمة غاسيل الإنجليزية لوصية يعقوب',
    nameEn: 'S. Gaselee English Testament of Jacob', abbreviation: 'TAJACOB-EN',
    url: 'https://gospelstudies.org.uk/earlychurch/pdf/e-books/box_g-h/testament-of-abraham_box.pdf', kind: 'reviewed-text-file',
    textFile: new URL('./data/testament_jacob_box_gaselee_1927.txt', import.meta.url),
    expectedSha256: 'a093a55e75281c8f925083f2d3c6757a80ceceb4ad5c8e721e39caa249f96662',
    expectedWordCount: 3650, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'القبطية البحيرية', sourceType: 'public-domain-text',
    notes: 'ترجمة س. غاسيل لوصية يعقوب عن الشاهد القبطي البحيري في مخطوط الفاتيكان القبطي ٦١، ضمن كتاب ج. هـ. بوكس الصادر سنة ١٩٢٧، الصفحات ٧٦–٨٩؛ يسجل الفهرس الرقمي الطبعة ملكاً عاماً. أُفرغ متن الترجمة في الصفحات المحددة، وأضيفت ملاحظة منفصلة تصف السقط كما أثبته المحقق من دون استكماله. هذا شاهد واحد لا يمثل الروايات العربية أو الإثيوبية، وحالته جزئية بسبب فجوات النص القبطي.'
  },
  {
    bookCode: 'QSB', slug: 'en-issaverdens-queen-solomon',
    nameAr: 'ترجمة إيسافردنس الإنجليزية لأسئلة ملكة سبأ وسليمان',
    nameEn: 'J. Issaverdens English Questions of the Queen of Sheba and Solomon', abbreviation: 'QSB-EN',
    url: 'https://archive.org/details/cu31924091353445', kind: 'reviewed-text-file',
    textFile: new URL('./data/queen_sheba_issaverdens_1901.txt', import.meta.url),
    expectedSha256: '6c346fd6457bcbfcd0d8bc80f17d220079d56182a79e49780b9c264134730a46',
    expectedWordCount: 930, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'الأرمنية', sourceType: 'public-domain-text',
    notes: 'ترجمة ج. إيسافردنس الإنجليزية في كتابه عن التقليد الأرمني، طبعة ١٩٠١، الصفحات ٢١١–٢١٥؛ رقمها الرقمي يذكر عدم وجود قيود حقوق معروفة في الولايات المتحدة. يترجم النص شاهداً أرمنياً، ويضم اختلافات الشواهد كما يشرح المؤلف. أُفرغت الأسئلة والأجوبة المنشورة مع إبقاء الحذف المطبوع بالنقاط كما هو؛ النص جزئي ولا يملأ الأجزاء المحذوفة، ولا يمثل الترجمة الأكاديمية الحديثة المحمية الحقوق أو الشاهد السرياني.'
  },
  {
    bookCode: 'ARL', slug: 'en-charles-aramaic-levi-fragments-1913',
    nameAr: 'ترجمة تشارلز الإنجليزية لشذرات وثيقة لاوي الآرامية',
    nameEn: 'R. H. Charles English Translation of Aramaic Levi Fragments', abbreviation: 'ARL-EN',
    url: 'https://archive.org/details/apocryphapseudep02charuoft', kind: 'reviewed-chapter-text-file',
    textFile: new URL('./data/aramaic_levi_charles_1913.json', import.meta.url),
    expectedSha256: '04e69320d4079c56cda50d9e21fcade764e90fe5ddc8009ce044e81bd061f9bb',
    expectedChapterCount: 4, expectedChapters: [1, 2, 3, 4], expectedWordCount: 2686, maxChapter: 4, incomplete: true,
    language: 'en', originalLanguage: 'الآرامية واليونانية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة ر. هـ. تشارلز في كتابه عن الأسفار القانونية الثانية والمنحولات، المجلد الثاني، طبعة أكسفورد ١٩١٣، الملحق الثاني، الصفحات المطبوعة ٣٦٤–٣٦٧؛ روجع التفريغ على صور الصفحات في نسخة الأرشيف. جُمعت المقاطع في أربعة أقسام بحسب عناوين الشواهد في الطبعة، لا بوصفها فصولاً أصلية: شذرتان آراميتان من مجموعة كامبردج، شذرات آرامية من مجموعة بودلي، استمرار يوناني موسوم في المصدر، ثم بقية شذرات كامبردج. أُبقيت علامات السقط والاستدراك المطبوعة بين الأقواس، وأرقام الشواهد في عناوين الأقسام. هذه ترجمة إنجليزية لنصوص مجزأة، وليست تفريغاً آرامياً أو يونانياً أصلياً، ولا تتمة كاملة لوصية لاوي؛ تبقى الحالة جزئية. الطبعة التاريخية ١٩١٣ ملك عام.'
  },
  {
    bookCode: 'ARL', slug: 'aramaic-levi-cambridge-pass-arendzen-1900',
    nameAr: 'التفريغ الآرامي المطبوع لشذرات كامبردج من وثيقة لاوي (١٩٠٠)',
    nameEn: 'Pass and Arendzen Aramaic Cambridge Genizah Fragment (1900)', abbreviation: 'ARL-ARC',
    url: 'https://www.jstor.org/stable/1450696', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/aramaic_levi_pass_arendzen_1900.json', import.meta.url),
    expectedSha256: '371b2a0ed3858f31cf6815ea7c8c57f3fe2bd6decbcacbf9da15e7eeb55b97ce',
    expectedUnitCount: 2, expectedUnitLocations: [[1, 1], [4, 1]],
    expectedWordCount: 616, maxChapter: 4, incomplete: true,
    language: 'aramaic', originalLanguage: 'الآرامية اليهودية الأدبية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'تفريغ آرامي بالحروف العبرية عن النص المطبوع في مقال هـ. ليونارد باس وج. أرندتسن، «شذرة من نص آرامي لوصية لاوي»، مجلة المراجعة اليهودية الفصلية، المجلد ١٢، العدد ٤، ١٩٠٠، الصفحات ٦٥١–٦٦١؛ قوبلت الأسطر الظاهرة بصور الصفحات المطبوعة. الشاهد هو مخطوط كامبردج ذي الرمز تي إس ١٦٫٩٤، وتصفه معاجم الآرامية بأنه يحوي ستة أعمدة. يعرض هذا التفريغ الأعمدة الستة المطبوعة في المقال، لا صورة المخطوط؛ وحُفظت الفجوات والاستدراكات والعلامات التحريرية ولم يُستكمل السقط. يقتصر على الشاهد الكامبردجي ولا يضم شذرات بودلي أو قمران، ولا يجعل وثيقة لاوي كاملة. المقال موسوم للإتاحة المفتوحة للقراءة على جيستور، لكن ذلك ليس رخصة إعادة نشر. أُدرج التفريغ استناداً إلى استنتاج الملكية العامة في الاتحاد الأوروبي من انتهاء مدة الحماية بعد وفاة آخر المؤلفين سنة ١٩٥٤ (حياة المؤلف زائد ٧٠ سنة، انقضت بنهاية ٢٠٢٤)؛ هذا استنتاج حقوقي إقليمي وليس ترخيصاً صريحاً أو حكماً عالمياً. [المقال المفتوح وصوره](https://www.jstor.org/stable/1450696)؛ [بيانات المخطوط والأعمدة الستة](https://cal.huc.edu/get_file_info.php?coord=81405001)؛ [نعي باس في كلية سانت جونز، كامبردج](https://www.joh.cam.ac.uk/sites/default/files/Eagle/Eagle%20Chapters/Obituaries/Obituary_1930s.pdf)؛ [بيانات أرندتسن ووفاته](https://en.wikisource.org/wiki/Author:John_Peter_Arendzen)؛ [مدة الحماية الأوروبية](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32006L0116).'
  },
  {
    bookCode: 'ARL', slug: 'arc-qdr-aramaic-levi-2026',
    nameAr: 'تفريغ قمران الرقمي للشواهد الآرامية من وثيقة لاوي',
    nameEn: 'Qumran-Digital Aramaic Levi Manuscript Lines', abbreviation: 'ARL-QDR-ARC',
    url: 'https://lexicon.qumran-digital.org/transcription-index/latest/index.html', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/aramaic_levi_qumran_digital_2026.json', import.meta.url),
    expectedSha256: '3923847635556cb3841ebfc3de3206830f5399e0429b3c99e20d00381ce045c7',
    expectedUnitCount: 281, expectedWordCount: 2403, maxChapter: 1, incomplete: true,
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ٢٨١ سطراً آرامياً من الشواهد القمرانية 1Q21 و4Q213 و4Q213a و4Q213b و4Q214 و4Q214a و4Q214b، كما نشرتها صفحات قمران الرقمي المؤرخة ٦ أكتوبر ٢٠٢٦. كل سطر محفوظ كوحدة منفصلة مع اسم الشاهد والشظية والسطر ورابط مباشر إلى موضعه. صفحات المشروع تعلن رخصة المشاع الإبداعي النسب بالمثل ٤٫٠؛ ينسب العمل إلى مشروع قمران الرقمي والجهة الأكاديمية الممولة، مع ذكر أن بياناته مبنية على عمل مشروع سابق ونص مارتن أبيغ. هذه الشواهد مجزأة ولا تمثل وثيقة لاوي كاملة أو إعادة بناء متصلة؛ وتبقى منفصلة عن ترجمة تشارلز وشاهد كامبردج من الجنيزة. [فهرس التفريغات](https://lexicon.qumran-digital.org/transcription-index/latest/index.html)؛ [تفريغ 1Q21](https://lexicon.qumran-digital.org/transcriptions/1Q21/2026-10-06/index.html?v=2026-10-06)؛ [تفريغ 4Q213](https://lexicon.qumran-digital.org/transcriptions/4Q213/2026-10-06/index.html?v=2026-10-06)؛ [تفريغ 4Q214](https://lexicon.qumran-digital.org/transcriptions/4Q214/2026-10-06/index.html?v=2026-10-06).'
  },
  {
    bookCode: 'NOAH', slug: 'he-qdr-1q19-noah-fragments-2026',
    nameAr: 'التفريغ العبري لشذرات الشاهد القمراني 1Q19',
    nameEn: 'Qumran Digital Hebrew 1Q19 Fragments', abbreviation: '1Q19-HE',
    url: 'https://lexicon.qumran-digital.org/transcriptions/1Q19/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/noah_1q19_qumran_digital.json', import.meta.url),
    expectedSha256: 'dd106fbdafcfdc1aed2325fdc1af806d2595d680cfbed1a0c33a5a45561a360d',
    expectedUnitCount: 42, expectedWordCount: 342, maxChapter: 19, incomplete: true,
    expectedChapterVerseNumbers: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7], [1], [1, 2, 3], [1, 2, 3], [1], [1, 2, 3], [1], [1], [1, 2], [1], [1, 2, 3], [1, 2, 3], [1], [1, 2], [1], [1], [1], [1]],
    language: 'he', originalLanguage: 'العبرية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ الشاهد العبري 1Q19 في ٤٢ سطراً موزعة على ١٩ مجموعة شظايا بحسب صفحة مشروع قمران الرقمي؛ أرقام المجموعات والأسطر الأصلية محفوظة في النص، مع رابط مباشر لكل سطر. لا تمثل هذه التقسيمات فصولاً أصلية ولا نصاً متصلاً. تسمية «كتاب نوح» تفسيرية ومختلف عليها، لذلك يسجل هنا شاهداً مرتبطاً بتقاليد نوح من دون الجزم بهوية العمل. تنص صفحة التفريغ على رخصة المشاع الإبداعي النسب بالمثل ٤٫٠ وتنسب بياناتها إلى مشروع قمران الرقمي، مع بيان اعتمادها على مشروع معجم سابق ونص مارتن أبيغ. لا تتضمن الصفحة ترجمة إنجليزية؛ أُدرج الأصل العبري المرخص وحده، وتبقى الحالة جزئية. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/1Q19/2026-10-06/index.html?v=2026-10-06)؛ [فهرس التفريغات](https://lexicon.qumran-digital.org/transcription-index/latest/index.html).'
  },
  {
    bookCode: 'NOAH', slug: 'he-qdr-1q19bis-noah-fragments-2024',
    nameAr: 'التفريغ العبري لشذرة الشاهد القمراني 1Q19bis',
    nameEn: 'Qumran Digital Hebrew 1Q19bis Fragment', abbreviation: '1Q19bis-HE',
    url: 'https://lexicon.qumran-digital.org/transcriptions/1Q19bis/2024-07-30/index.html?v=2024-07-30', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/noah_1q19bis_qumran_digital.json', import.meta.url),
    expectedSha256: '9184bf5930ce27adcc1bf85a9e65792167e60ab74554ceaf882a9995f596e794',
    expectedUnitCount: 6, expectedVerseNumbers: [1, 2, 3, 4, 5, 6],
    expectedWordCount: 48, maxChapter: 1, incomplete: true,
    language: 'he', originalLanguage: 'العبرية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ الشذرة العبرية 1Q19bis، المجموعة 2، في ستة أسطر ظاهرة؛ تحفظ أرقام الشاهد والمجموعة والسطر وروابط مواضعها المباشرة. لا تتضمن صفحة مشروع قمران الرقمي ترجمة إنجليزية، كما أن صلة الشذرة بكتاب نوح المستقل ليست محسومة؛ لذلك تعرض منفصلة عن 1Q19 ولا تدمج به. يعلن المصدر رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، وينسب النص إلى مشروع قمران الرقمي المبني على بيانات مشروع معجم سابق ونص مارتن أبيغ. أُدرج الأصل العبري المرخص وحده، وحالة الشاهد جزئية. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/1Q19bis/2024-07-30/index.html?v=2024-07-30)؛ [فهرس التفريغات](https://lexicon.qumran-digital.org/transcription-index/latest/index.html).'
  },
  {
    bookCode: 'BNOAH', slug: 'arc-qdr-4q534-birth-noah-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q534 (شذرات ولادة نوح)',
    nameEn: 'Qumran Digital Aramaic 4Q534 Birth of Noah Witness', abbreviation: '4Q534-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q534/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/birth_of_noah_4q534_qumran_digital.json', import.meta.url),
    expectedSha256: 'd155bf7c9c4f51484de03d0c9b8f9750e7d9f580372bc6ef443d34cd124bdcee',
    expectedUnitCount: 51, expectedWordCount: 500, maxChapter: 7, incomplete: true,
    expectedChapterVerseNumbers: [[...Array(17)].map((_, index) => index + 1), [...Array(21)].map((_, index) => index + 1), [1], [1, 2], [1], [1, 2], [...Array(7)].map((_, index) => index + 1)],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ٥١ سطراً ظاهراً من الشاهد الآرامي 4Q534 في سبع مجموعات عرض، مع حفظ علامات الشظايا والأسطر الأصلية وروابط مواضع كل سطر. المجموعات ليست فصولاً أصلية والنص غير متصل. بعض الباحثين ينسبون شخصية الشاهد إلى نوح، لكن الهوية غير يقينية، كما أن ضم الشواهد 4Q534 و4Q535 و4Q536 إلى مؤلف واحد ليس قطعياً؛ لذلك تسجل منفصلة وبحالة جزئية. صفحة قمران الرقمي تعلن رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، ولا تقدم ترجمة إنجليزية مرخصة. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/4Q534/2026-10-06/index.html?v=2026-10-06)؛ [دليل المخطوطات الآرامية بقمران، طبعة بريِل المفتوحة](https://brill.com/display/book/9789004513815/9789004513815_webready_content_text.pdf).'
  },
  {
    bookCode: 'BNOAH', slug: 'arc-qdr-4q535-birth-noah-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q535 (شذرات ولادة نوح)',
    nameEn: 'Qumran Digital Aramaic 4Q535 Birth of Noah Witness', abbreviation: '4Q535-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q535/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/birth_of_noah_4q535_qumran_digital.json', import.meta.url),
    expectedSha256: '4f6e07459bba00b2c9bf2be11d5a72bfcb956bfcdaf3b6937f1c7df2f4572156',
    expectedUnitCount: 12, expectedWordCount: 107, maxChapter: 3, incomplete: true,
    expectedChapterVerseNumbers: [[1, 2], [1, 2, 3, 4], [1, 2, 3, 4, 5, 6]],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ١٢ سطراً ظاهراً من الشاهد الآرامي 4Q535 في ثلاث مجموعات عرض، مع حفظ علامات الشظايا والأسطر الأصلية وروابط مواضع كل سطر. المجموعات ليست فصولاً أصلية، والشاهد منفصل عن 4Q534 و4Q536 ولا يثبت وحده نصاً متصلاً أو هوية نوح. تسميته ضمن شذرات ولادة نوح فرضية تصنيفية؛ العلاقة بين الشواهد موضع نقاش، لذلك يسجل منفرداً وبحالة جزئية. صفحة قمران الرقمي تعلن رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، ولا تقدم ترجمة إنجليزية مرخصة. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/4Q535/2026-10-06/index.html?v=2026-10-06)؛ [دليل المخطوطات الآرامية بقمران، طبعة بريِل المفتوحة](https://brill.com/display/book/9789004513815/9789004513815_webready_content_text.pdf).'
  },
  {
    bookCode: 'BNOAH', slug: 'arc-qdr-4q536-birth-noah-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q536 (شذرات ولادة نوح)',
    nameEn: 'Qumran Digital Aramaic 4Q536 Birth of Noah Witness', abbreviation: '4Q536-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q536/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/birth_of_noah_4q536_qumran_digital.json', import.meta.url),
    expectedSha256: '6845c801096aef0f397409efc0d263bbdb64413a6e6645a67c09ea2077337f3a',
    expectedUnitCount: 25, expectedWordCount: 260, maxChapter: 4, incomplete: true,
    expectedChapterVerseNumbers: [[1, 2, 3, 4], [...Array(13)].map((_, index) => index + 1), [7, 8, 9, 10, 11, 12, 13], [1]],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ٢٥ سطراً ظاهراً من الشاهد الآرامي 4Q536 في أربع مجموعات عرض، مع حفظ علامات الشظايا والأسطر الأصلية وروابط مواضع كل سطر، بما فيها الترقيم الأصلي 7–13 في المجموعة الثالثة. المجموعات ليست فصولاً أصلية والنص غير متصل. علاقة 4Q536 بالشاهدين 4Q534 و4Q535 وترابط أجزاء المجموعة غير محسوم؛ لذلك يسجل الشاهد منفرداً وبحالة جزئية. صفحة قمران الرقمي تعلن رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، ولا تقدم ترجمة إنجليزية مرخصة. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/4Q536/2026-10-06/index.html?v=2026-10-06)؛ [دليل المخطوطات الآرامية بقمران، طبعة بريِل المفتوحة](https://brill.com/display/book/9789004513815/9789004513815_webready_content_text.pdf).'
  },
  {
    bookCode: 'GENAP', slug: 'arc-qdr-1q20-genesis-apocryphon-2026',
    nameAr: 'تفريغ الشاهد القمراني 1Q20 (أبوكريفون التكوين)',
    nameEn: 'Qumran Digital Aramaic Genesis Apocryphon 1Q20', abbreviation: '1Q20-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/1Q20/2026-10-06/index.html?v=2026-10-06',
    kind: 'reviewed-unit-text-file', textFile: GENESIS_APOCRYPHON_TEXT_FILE,
    expectedSha256: 'db9821bef3133e546c456e1d6516ce606c255a2822aa0490176e55bbc26781d7',
    expectedUnitCount: 494, expectedUnitLocations: GENESIS_APOCRYPHON_EXPECTED_LOCATIONS,
    expectedWordCount: 7788, maxChapter: 23, incomplete: true,
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ آرامي لـ٤٩٤ سطراً من الشاهد القمراني 1Q20 كما نشره مشروع قمران الرقمي في ٦ أكتوبر ٢٠٢٦. حُفظ ترقيم الأعمدة ٠–١٧ و١٩–٢٢ والأسطر الظاهرة، مع رابط مباشر لكل سطر؛ العمود ١٨ غير موجود في المصدر ولم يُستكمل. أرقام الفصول في واجهة العرض تنظيمية فقط وليست فصولاً أصلية، والصفحة تعرض النص كشاهد مخطوط لا كترجمة. الشاهد ناقص بطبيعته، لذلك حالة العمل جزئية. تنص صفحة المصدر على رخصة المشاع الإبداعي النسب بالمثل ٤٫٠ وتذكر أن بيانات التفريغ مبنية على عمل مشروع معجم قمران السابق ونص مارتن أبيغ. لم أعثر في المصدر على ترجمة إنجليزية معلنة الرخصة لإعادة النشر؛ لذلك أُدرج الأصل الآرامي وحده. [تفريغ الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/1Q20/2026-10-06/index.html?v=2026-10-06)؛ [فهرس تفريغات قمران الرقمي](https://lexicon.qumran-digital.org/transcription-index/latest/index.html).'
  },
  {
    bookCode: 'APLEV540', slug: 'arc-qdr-apocryphon-levi-a-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q540 (منحول لاوي أ)', nameEn: 'Qumran Digital 4Q540 Aramaic Fragment Witness', abbreviation: '4Q540-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q540/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/aramaic_levi_apocryphon_a_4q540_2026.json', import.meta.url),
    expectedSha256: '1880ddb24fbd71b2ee9c8f7ba89044ce68a93c242dd212117c4f3b115e21d79b',
    expectedUnitCount: 9, expectedWordCount: 94, maxChapter: 3, incomplete: true,
    expectedChapterVerseNumbers: [[1, 2, 3, 4, 5, 6], [1, 2], [1]],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ الشاهد الآرامي 4Q540 كما نشره مشروع قمران الرقمي بتاريخ ٦ أكتوبر ٢٠٢٦، مع حفظ الأسطر التسعة الظاهرة في الشظايا الثلاث وروابطها المباشرة؛ والأقسام الثلاثة وحدات عرض وليست فصولاً أصلية. يصفه الفهرس الحديث بمنحول لاوي أ، لكن الشاهد شذري شديد الاقتضاب ولا يتيح بناء نص متصل أو ترجمة موثوقة؛ لذلك لا يُدمج مع وثيقة لاوي 1Q21 و4Q213–214 ولا يوصف بأنه سفر مكتمل. وجدت ترجمتين إنجليزيتين مساعدتين لهذين الشاهدين في صفحتي تينمو لعام ٢٠٢٦، لكنهما لا تعرضان رخصة لإعادة النشر؛ ومجموعة أوبن ديد سي الإنجليزية مرخصة لغير التجاري فقط. لذلك لم تُنسخ أي ترجمة، وأُدرج الأصل الآرامي المرخص وحده. [ترجمة 4Q540 في تينمو](https://tianmu.org/good-work-library/judean/dead-sea-scrolls/testaments-and-apocrypha/apocryphon-of-levi-a)؛ [ترجمة 4Q541 في تينمو](https://tianmu.org/good-work-library/judean/dead-sea-scrolls/testaments-and-apocrypha/apocryphon-of-levi)؛ [رخصة مجموعة أوبن ديد سي](https://opendeadsea.org/about/). [ترجمة 4Q540 في تينمو](https://tianmu.org/good-work-library/judean/dead-sea-scrolls/testaments-and-apocrypha/apocryphon-of-levi-a)؛ [ترجمة 4Q541 في تينمو](https://tianmu.org/good-work-library/judean/dead-sea-scrolls/testaments-and-apocrypha/apocryphon-of-levi)؛ [رخصة أوبن ديد سي غير التجارية](https://opendeadsea.org/about/). يعلن المصدر رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، وينسب التفريغ إلى مشروع قمران الرقمي الممول من مؤسسة الأبحاث الألمانية، ويذكر اعتماد بياناته على مشروع معجم قمران السابق المبني على عمل مارتن أبيغ. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/4Q540/2026-10-06/index.html?v=2026-10-06)؛ [مشروع قمران الرقمي](https://lexicon.qumran-digital.org/transcription-index/latest/index.html).'
  },
  {
    bookCode: 'APLEV541', slug: 'arc-qdr-apocryphon-levi-b-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q541 (منحول لاوي ب؟)', nameEn: 'Qumran Digital 4Q541 Aramaic Fragment Witness', abbreviation: '4Q541-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q541/2026-05-21/index.html', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/aramaic_levi_apocryphon_b_4q541_2026.json', import.meta.url),
    expectedSha256: 'cc5c2c39d1a31e3ff4e1e0cbb49abffbe2434ab7853213b0530bbc46787e6e95',
    expectedUnitCount: 118, expectedWordCount: 947, maxChapter: 31, incomplete: true,
    expectedChapterVerseNumbers: [[2, 3, 4], [1, 2, 3, 4, 5], [3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7], [3, 4, 5, 6, 7], [1, 2, 3, 4], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3], [1, 2, 3], [1, 2], [1, 2, 3], [1, 2], [1, 2], [1], [1], [8], [1, 2, 3, 4, 5, 6], [1]],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ الشاهد الآرامي 4Q541 كما نشره مشروع قمران الرقمي بتاريخ ٢١ مايو ٢٠٢٦، مع حفظ الأسطر الـ١١٨ الظاهرة في ٣١ مجموعة عرض للشظايا وترقيم كل سطر ورابطه المباشر؛ وهذه المجموعات ليست فصولاً أصلية. تسمية «منحول لاوي ب» ترد مع علامة استفهام في بعض الفهارس؛ وعلاقة هذا الشاهد بـ4Q540 وبوثيقة لاوي الأوسع موضع نقاش، لذلك يُحفظ هنا كسجل مستقل ولا يُعاد بناء نص موحد. النص شذري ولا يمثل عملاً كاملاً، ولم أعثر في هذا المصدر على ترجمة إنجليزية معلنة الرخصة؛ لذا أُدرج الأصل الآرامي وحده. يعلن المصدر رخصة المشاع الإبداعي النسب بالمثل ٤٫٠، وينسب التفريغ إلى مشروع قمران الرقمي الممول من مؤسسة الأبحاث الألمانية، ويذكر اعتماد بياناته على مشروع معجم قمران السابق المبني على عمل مارتن أبيغ. [صفحة الشاهد والرخصة](https://lexicon.qumran-digital.org/transcriptions/4Q541/2026-05-21/index.html)؛ [مشروع قمران الرقمي](https://lexicon.qumran-digital.org/transcription-index/latest/index.html).'
  },
  {
    bookCode: 'QAHAT', slug: 'arc-qdr-testament-qahat-2026',
    nameAr: 'تفريغ الشاهد القمراني 4Q542 (وصية قهات)', nameEn: 'Qumran Digital 4Q542 Aramaic Testament of Qahat', abbreviation: '4Q542-ARC',
    url: 'https://lexicon.qumran-digital.org/transcriptions/4Q542/2026-10-06/index.html?v=2026-10-06', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/testament_qahat_qumran_digital_2026.json', import.meta.url),
    expectedSha256: 'dc2174c5eeb7374cf47511f42f9f05fc598bb0ccb44295b5b6e921361abbd03d',
    expectedUnitCount: 39, expectedWordCount: 451, maxChapter: 5, incomplete: true,
    expectedChapterVerseNumbers: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], [5, 6, 7, 8, 9, 10, 11, 12, 13], [1], [11, 12, 13]],
    language: 'arc', originalLanguage: 'الآرامية', sourceType: 'cc-by-sa-4.0', siteScope: 'both',
    notes: 'تفريغ ٣٩ سطراً ظاهراً من الشاهد الآرامي 4Q542، في خمسة أقسام عرض بحسب تقسيم صفحة التفريغ، لا خمسة فصول أصلية؛ حُفظت أرقام السطر الأصلية وروابط الموضع. يعلن المصدر رخصة المشاع الإبداعي النسب بالمثل ٤٫٠ وينسب العمل إلى مشروع قمران الرقمي، ويذكر اعتماد بياناته على مشروع معجم قمران السابق المبني على عمل مارتن أبيغ. يُعرف النص باسم «وصية قهات»، ويصور انتقال تعاليم وتراث الكهنوت من لاوي إلى قهات ثم ابنه عمرام. وتوجد فرضية علمية بأن 4Q542 و4Q547 قد يكونان جزءين من اللفافة نفسها، أو أن النص المعنون وصية قهات قسم من رؤى عمرام؛ لم يُحسم ذلك، لذلك يظل هذا الشاهد في سجل مستقل. عُثر على ترجمة إنجليزية في صفحة مشروع تينمو، لكنها لا تعرض رخصة لإعادة النشر؛ لذا يُدرج الأصل الآرامي المرخص فقط، مع إبقاء الشاهد جزئياً وعدم ملء السقط. [صفحة 4Q542 ورخصتها](https://lexicon.qumran-digital.org/transcriptions/4Q542/2026-10-06/index.html?v=2026-10-06)؛ [الترجمة الإنجليزية غير المرخصة لإعادة النشر](https://tianmu.org/good-work-library/judean/dead-sea-scrolls/testaments-and-apocrypha/testament-of-qahat)؛ [دراسة علاقة 4Q542 و4Q547](https://brill.com/view/journals/jsj/52/1/article-p27_2.pdf).'
  },
  {
    bookCode: 'APOCEL', slug: 'grc-psi-i-7-apocalypse-elijah-1912',
    nameAr: 'الشاهد اليوناني الشذري من رؤيا إيليا (PSI I 7)',
    nameEn: 'PSI I 7 Greek Papyrus Fragment of the Apocalypse of Elijah', abbreviation: 'APOCEL-GR',
    url: 'https://archive.org/details/papirigrecielati01sociuoft/page/16/mode/1up',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/apocalypse_elijah_psi_1912_greek.json', import.meta.url),
    expectedSha256: 'dcb07bf1b20c2e7370bd84d49497fc19121933c297bc280526838fa411ebc125',
    expectedUnitCount: 7, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7],
    expectedWordCount: 24, maxChapter: 1, incomplete: true,
    language: 'greek', originalLanguage: 'اليونانية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'تفريغ الأسطر السبعة على ظهر البردية PSI I 7، كما طبعه إرمينيغيلدو بستللي في Papiri greci e latini، المجلد الأول، فلورنسا ١٩١٢، ص ١٦؛ قوبلت الكلمات بصورة الصفحة وحُفظت مواضع الفقد، مع توحيد علامة الفجوة إلى […]. الأقواس تحفظ الاستدراك والسقط في الطبعة، والفهرس البحثي الحديث يصف هذا الوجه بأنه نهاية رؤيا إيليا. لم أستورد الأسطر الخمسة على الوجه الآخر لأن المحرر نفسه لم يستطع تحديد موضعها ولا إثبات أنها من النص نفسه. المتن هنا شذرة من نهاية عمل أكبر، وليس سفراً كاملاً ولا فصولاً أصلية؛ أرقام الوحدات تسلسلية للعرض فقط. طبعة بستللي عامة الحقوق: توفي سنة ١٩٢٧، ويؤكد سجل الأرشيف الحكومي الإيطالي ذلك. [الطبعة المصورة، ص ١٦](https://archive.org/details/papirigrecielati01sociuoft/page/16/mode/1up)؛ [وصف البردية وسبعة أسطر الوجه الخلفي](https://4care-skos.mf.no/4care-artefacts/493/)؛ [سجل وفاة بستللي](https://siusa-archivi.cultura.gov.it/cgi-bin/pagina.pl?Chiave=50473&TipoPag=prodpersona).'
  },
  {
    bookCode: 'APOCEL', slug: 'ar-psi-i-7-apocalypse-elijah-editorial-parallel-1912',
    nameAr: 'صياغة عربية تفسيرية لشرح بستللي عن النص القبطي الموازي',
    nameEn: 'Arabic Rendering of Pistelli’s German Explanation of the Coptic Parallel', abbreviation: 'APOCEL-AR',
    url: 'https://archive.org/details/papirigrecielati01sociuoft/page/16/mode/1up',
    kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/apocalypse_elijah_psi_1912_ar.json', import.meta.url),
    expectedSha256: 'f28e17ad72fc8f9fd74a2238927e3150d3f9c1fffb5bf20a7cdda2e752ac4f17',
    expectedUnitCount: 7, expectedVerseNumbers: [1, 2, 3, 4, 5, 6, 7],
    expectedWordCount: 31, maxChapter: 1, incomplete: true,
    language: 'ar', originalLanguage: 'اليونانية؛ وهذه الصياغة تتبع شرحاً ألمانياً للنص القبطي الموازي', sourceType: 'project-translation', siteScope: 'both',
    notes: 'صياغة عربية لمعنى الشرح الألماني للنص القبطي الموازي الذي يورده بستللي سنة ١٩١٢ عن طبعة شتايندورف، وليست ترجمة حرفية للبردية اليونانية. وُضعت علامة […] حول ما يورده الشرح ولا تحفظه الأسطر اليونانية بوضوح؛ لذلك لا يجوز استعمالها لتكميل الشذرة أو دمجها في شاهد يوناني كامل. أُبقيت في سبع وحدات عرضية لموازاة مواضع الأسطر، وحالة العمل جزئية.'
  },
  {
    bookCode: 'SEELI', slug: 'en-othergospels-sefer-elijah-zinner-public-domain',
    nameAr: 'ترجمة صموئيل زينر الإنجليزية لكتاب إيليا العبري',
    nameEn: 'Samuel Zinner Public-Domain English Sefer Elijah', abbreviation: 'SEELI-EN',
    url: 'https://othergospels.com/elijah/', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/sefer_elijah_zinner_public_domain.json', import.meta.url),
    expectedSha256: 'e4528266ea2769723c774f5855de901f618c232ad4c65554c18172907743fa20',
    expectedUnitCount: 25, expectedWordCount: 1888, maxChapter: 1, incomplete: false,
    language: 'en', originalLanguage: 'العبرية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة صموئيل زينر الإنجليزية لكتاب إيليا العبري (سفر إلياهو)، شاهد عبري متأخر مستقل عن رؤيا إيليا القبطية واليونانية واللاتينية. أُهديت نصوص مبادرة النصوص المفتوحة إلى الملك العام بحسب سياسة صفحة المبادرة؛ استُخدم متن الترجمة وحده دون المقدمة أو التعليقات. حُفظت الوحدات الخمس والعشرون وإحالاتها وخاتمتها.'
  },
  {
    bookCode: 'APDANC', slug: 'en-pearse-coptic-apocalypse-daniel-public-domain',
    nameAr: 'ترجمة روجر بيرس الإنجليزية عن الفرنسية لرؤيا دانيال القبطية',
    nameEn: 'Roger Pearse Public-Domain English Coptic Apocalypse of Daniel', abbreviation: 'APDANC-EN',
    url: 'https://www.tertullian.org/fathers/apocalypse_of_daniel_coptic_02_text.htm', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/coptic_apocalypse_daniel_pearse_public_domain.json', import.meta.url),
    expectedSha256: '9c0912d88cc3baf33c9909a13353e3f5768a1be05f600f6231488680ea9b7c06',
    expectedUnitCount: 28, expectedWordCount: 1839, maxChapter: 1, incomplete: false,
    language: 'en', originalLanguage: 'القبطية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'النص الكامل للرؤيا الرابعة عشرة لدانيال كما في الشاهد القبطي، في ترجمة روجر بيرس الإنجليزية المنشورة سنة ٢٠٠٩ عن ترجمة فريدريك ماكلير الفرنسية لعام ١٨٩٦؛ يصف بيرس ترجمته بأنها تقريبية ومنخفضة القيمة العلمية، لذا لا تُعرض على أنها ترجمة مباشرة عن القبطية أو طبعة علمية. حُفظ المتن المرقم ١–٢٨ في ٢٨ وحدة، واستُبعدت مقدمة بيرس والحواشي التفسيرية. يصرح المصدر بأن الملف ومادته ملك عام.'
  },
  {
    bookCode: 'APADAM', slug: 'en-zinner-apocalypse-adam-public-domain',
    nameAr: 'ترجمة زينر الإنجليزية لرؤيا آدم',
    nameEn: 'Samuel Zinner Public-Domain English Apocalypse of Adam', abbreviation: 'APADAM-EN',
    url: 'https://www.luminescence-llc.net/the-apocalypse-of-adam', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/apocalypse_adam_zinner_public_domain.json', import.meta.url),
    expectedSha256: '9515a3cf238c52b17cfcb81359d2ef9ab3c862e8190d250d4a06de0c551b9916',
    expectedUnitCount: 49, expectedWordCount: 3070, maxChapter: 1, incomplete: true,
    language: 'en', originalLanguage: 'القبطية الصعيدية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة صموئيل زينر عن القبطية، حررها مارك ماتيسون، وقد أُهديت إلى الملك العام بنص صريح من صفحة المصدر. أُفرغ المتن الباقي من مخطوط نجع حمادي الخامس، النص الخامس، في فصل واحد و٤٩ وحدة فقرةً فقرة، مع حفظ أرقام صفحات المخطوط والعلامات المطبوعة للفجوات والتصحيحات. العمل جزئي لأن الشاهد القبطي يتضمن فجوات ظاهرة؛ لم تُملأ. تذكر الصفحة نفسها خطأً أن الأساس هو المخطوط الأول، مع أن عنوانها ورقم النص والروابط إلى صفحات المخطوط تشير إلى الخامس، النص الخامس؛ لذلك لم نعتمد ذلك الوصف الخاطئ.'
  },
  {
    bookCode: 'APJAMES', slug: 'en-harris-syriac-revelation-james',
    nameAr: 'رؤيا يعقوب الرسول السريانية: ترجمة هاريس',
    nameEn: 'J. Rendel Harris English Syriac Revelation of James the Apostle', abbreviation: 'APJAMES-EN',
    url: 'https://archive.org/details/cu31924029295819', kind: 'reviewed-text-file',
    textFile: new URL('./texts/revelation-james-syriac-harris-1900.txt', import.meta.url),
    expectedSha256: '40f845f39673b1dabe665e68cc77cf2bb90fdd455a37a0afd3388c4079adec74',
    expectedWordCount: 603, maxChapter: 1,
    language: 'en', originalLanguage: 'السريانية', sourceType: 'public-domain-text',
    notes: 'ترجمة ج. ريندل هاريس، طبعة ١٩٠٠، الصفحتان ٣٣–٣٤؛ مخطوط جامعة هارفرد السرياني ٩٣، الورقتان ٥٣ظ–٥٤و (هاريس ٨٥ سابقاً). راجعنا كل كلمة على صورة الصفحتين الممسوحتين. هذا عمل مستقل عن رؤيا يعقوب القبطية في مكتبة نجع حمادي، ولا يُدمج معها. نص الطبعة القديمة ملك عام.'
  },
  {
    bookCode: 'PSLAB', slug: 'en-james-biblical-antiquities',
    nameAr: 'ترجمة جيمس الإنجليزية للآثار الكتابية المنحولة',
    nameEn: 'M. R. James English Biblical Antiquities of Pseudo-Philo', abbreviation: 'PSLAB-EN',
    url: 'https://ccat.sas.upenn.edu/rak/publics/pseudepig/LAB.html', kind: 'reviewed-chapter-text-file',
    textFile: new URL('./data/pseudo_philo_james_1917.json', import.meta.url),
    expectedSha256: 'e8f4ce9a731700b7e2213208fb9deadfb175074142c504798e8b41cb849dee6f',
    expectedChapterCount: 63,
    expectedChapters: [...Array.from({ length: 42 }, (_, index) => index + 1), 44, 45, 46, ...Array.from({ length: 18 }, (_, index) => index + 48)],
    maxChapter: 65, incomplete: true,
    language: 'en', originalLanguage: 'اللاتينية، بترجمة إنجليزية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة م. ر. جيمس عن اللاتينية، طبعة ١٩١٧؛ النص الرقمي من تفريغ جامعة بنسلفانيا لطبعة الكتاب مع حذف التعليقات التحريرية المضافة باللون الأحمر وحواشي المحقق من المتن. تسجل المقدمة فجوة ٣٧:١/٢ وسقطاً عند ٣٧:٥/٣٨:١، وخاتمة ضائعة؛ كما لا تتوفر في الطبعة فصول ٤٣ و٤٧. لذلك تحفظ الفصول الـ٦٣ المتبقية بأرقامها الأصلية ويظل العمل جزئياً. المصدر الرقمي يجيز الاستخدام غير التجاري بشرط إبقاء هذا الإسناد: “Scanned at sacred-texts.com, May 2004. John Bruno Hare, redactor.” طبعة ١٩١٧ معلنة ملكاً عاماً.'
  },
  {
    bookCode: 'APZEPH', slug: 'en-intertextual-apocalypse-zephaniah',
    nameAr: 'الشذرات الإنجليزية لرؤيا صفنيا', nameEn: 'Public-domain English Apocalypse of Zephaniah fragments', abbreviation: 'APZEPH-EN',
    url: 'https://intertextual.bible/read/apocalypse-of-zephaniah', kind: 'intertextual-paged-chapters-html', maxChapter: 14,
    language: 'en', originalLanguage: 'القبطية', sourceType: 'public-domain-text', incomplete: true,
    notes: 'عرض رقمي مبني على ترجمتي شتايندورف ١٨٩٩ وويلسون ١٨٨٥ المعلنتين ملكاً عاماً. يحفظ ١٤ مقطعاً/فصلاً من الشذرات القبطية، وبعض الوحدات نفسها ناقصة بعلامات حذف؛ لا يمثل نصاً كاملاً ولا ترتيباً مخطوطياً محققاً.'
  },
  {
    bookCode: 'TSTADAM', slug: 'syr-ocp-testament-adam',
    nameAr: 'الشاهد السرياني لوصية آدم', nameEn: 'OCP Syriac Testament of Adam', abbreviation: 'TSTADAM-SYR',
    url: TESTAMENT_ADAM_OCP_URL, kind: 'ocp-xml', maxChapter: 3, language: 'syr', versionLanguage: 'Syriac',
    originalLanguage: 'السريانية', sourceType: 'open-critical-edition',
    notes: 'النص السرياني في الطبعة النقدية الرقمية لمشروع OCP؛ يحفظ شاهداً مستقلاً، ولا يخلط مع حياة آدم وحواء أو رؤيا موسى.'
  },
  {
    bookCode: 'TSTADAM', slug: 'en-ocp-syriac-testament-adam',
    nameAr: 'الترجمة الإنجليزية للشاهد السرياني لوصية آدم', nameEn: 'OCP English Translation of Syriac Testament of Adam', abbreviation: 'TSTADAM-SYR-EN',
    url: TESTAMENT_ADAM_OCP_URL, kind: 'ocp-xml', maxChapter: 3, language: 'en', versionLanguage: 'English', versionIndex: 0,
    originalLanguage: 'السريانية', sourceType: 'open-critical-translation',
    notes: 'ترجمة OCP الإنجليزية للشاهد السرياني؛ تحفظ منفصلة عن ترجمة الشاهد اليوناني وعن النص السرياني.'
  },
  {
    bookCode: 'TSTADAM', slug: 'grc-ocp-testament-adam',
    nameAr: 'الشاهد اليوناني لوصية آدم', nameEn: 'OCP Greek Testament of Adam', abbreviation: 'TSTADAM-GRC',
    url: TESTAMENT_ADAM_OCP_URL, kind: 'ocp-xml', maxChapter: 2, language: 'grc', versionLanguage: 'Greek',
    originalLanguage: 'اليونانية', sourceType: 'open-critical-edition',
    notes: 'الشاهد اليوناني في طبعة OCP النقدية، بتقسيم مستقل من ١٣ فصلاً؛ يختلف في بنية وحداته عن الشاهد السرياني.'
  },
  {
    bookCode: 'TSTADAM', slug: 'en-ocp-greek-testament-adam',
    nameAr: 'الترجمة الإنجليزية للشاهد اليوناني لوصية آدم', nameEn: 'OCP English Translation of Greek Testament of Adam', abbreviation: 'TSTADAM-GRC-EN',
    url: TESTAMENT_ADAM_OCP_URL, kind: 'ocp-xml', maxChapter: 2, language: 'en', versionLanguage: 'English', versionIndex: 1,
    originalLanguage: 'اليونانية', sourceType: 'open-critical-translation',
    notes: 'ترجمة OCP الإنجليزية للشاهد اليوناني؛ تحفظ مستقلة عن الترجمة الموازية للشاهد السرياني.'
  },
  {
    bookCode: 'APDAN', slug: 'grc-ocp-apocalypse-daniel',
    nameAr: 'الشاهد اليوناني لرؤيا دانيال', nameEn: 'OCP Greek Apocalypse of Daniel', abbreviation: 'APDAN-GRC',
    url: `${OCP_RAW_BASE}ApDan.xml`, kind: 'ocp-xml', maxChapter: 13, chapterOffset: -1, language: 'grc', versionLanguage: 'Greek',
    originalLanguage: 'اليونانية', sourceType: 'open-critical-edition',
    notes: 'طبعة OCP للشاهد اليوناني، وتحفظ الفصول ٢–١٤ من المصدر بترقيم العرض الداخلي ١–١٣.'
  },
  {
    bookCode: 'APDAN', slug: 'en-project-apocalypse-daniel-greek',
    nameAr: 'ترجمة إنجليزية جديدة عن الشاهد اليوناني لرؤيا دانيال',
    nameEn: 'Project English Translation of the Greek Apocalypse of Daniel', abbreviation: 'APDAN-EN',
    url: `${OCP_RAW_BASE}ApDan.xml`, kind: 'reviewed-unit-text-file', maxChapter: 13, incomplete: false,
    textFile: new URL('./data/apocalypse_daniel_greek_project_english.json', import.meta.url),
    expectedSha256: 'be5ebc409838afdc39eca4c64ccadb3bf3241dca961614d30ecd5497a58db195',
    expectedUnitCount: 170, expectedUnitLocations: APDAN_GREEK_UNIT_LOCATIONS, expectedWordCount: 2482,
    language: 'en', versionLanguage: 'English', originalLanguage: 'اليونانية',
    sourceType: 'project-translation', siteScope: 'both',
    notes: 'ترجمة إنجليزية جديدة أُعدت للمشروع مباشرة عن وحدات الشاهد اليوناني المنشورة في OCP، لا عن ترجمة زرفوس المحمية أو الترجمة التجارية الحديثة. تغطي الوحدات الـ١٧٠ نفسها، وتحفظ فجوات ترقيم الشاهد كما هي. تشير الأقواس التحريرية في ثلاثة مواضع إلى غموض اللفظ اليوناني ولا تستكمل ما لا يقوله المصدر. ملفات OCP متاحة بتراخيص مفتوحة؛ وتُنشر ترجمة المشروع برخصة المشاع الإبداعي النسب ٤٫٠ مع نسبة مصدر النص.'
  },
  {
    bookCode: 'APEZRA', slug: 'grc-ocp-greek-apocalypse-ezra',
    nameAr: 'الشاهد اليوناني لرؤيا عزرا', nameEn: 'OCP Greek Apocalypse of Ezra', abbreviation: 'APEZRA-GRC',
    url: `${OCP_RAW_BASE}ApEzra.xml`, kind: 'ocp-xml', maxChapter: 7, language: 'grc', versionLanguage: 'Greek',
    originalLanguage: 'اليونانية', sourceType: 'open-critical-edition',
    notes: 'نص يوناني من طبعة نقدية OCP، منفصل عن عزرا الثاني ورؤيا عزرا اللاتينية.'
  },
  {
    bookCode: 'REVEZRA', slug: 'la-ocp-revelation-qualities-year-ezra',
    nameAr: 'الشاهد اللاتيني لرؤيا صفات السنة المنسوبة إلى عزرا', nameEn: 'OCP Latin Revelation of Ezra on the Qualities of the Year', abbreviation: 'REVEZRA-LA',
    url: `${OCP_RAW_BASE}RevEsdr.xml`, kind: 'ocp-xml', maxChapter: 1, language: 'la', versionLanguage: 'Latin',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-edition',
    notes: 'نص قصير من طبعة ميركاتي 1901 كما رقمنته OCP؛ يحفظ مستقلاً عن بقية رؤى عزرا.'
  },
  {
    bookCode: 'REVEZRA', slug: 'en-ocp-revelation-qualities-year-ezra',
    nameAr: 'الترجمة الإنجليزية لرؤيا صفات السنة المنسوبة إلى عزرا', nameEn: 'OCP English Revelation of Ezra on the Qualities of the Year', abbreviation: 'REVEZRA-EN',
    url: `${OCP_RAW_BASE}RevEsdr.xml`, kind: 'ocp-xml', maxChapter: 1, expectedUnits: 7, readingMss: 'Trans', language: 'en', versionLanguage: 'Latin',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-translation',
    notes: 'الترجمة الإنجليزية المضمنة في الطبعة الرقمية النقدية OCP تحت الشاهد Trans، مقترنة بالنص اللاتيني من طبعة ميركاتي 1901. حُفظت وحداتها السبع في فصل واحد وبترقيم المصدر. ترخيص مستودع OCP: CC BY 4.0، مع نسبة التحرير والمصدر.'
  },
  {
    bookCode: 'VISEL', slug: 'la-ocp-vision-elijah',
    nameAr: 'الشاهد اللاتيني لرؤيا إيليا', nameEn: 'OCP Latin Vision of Elijah', abbreviation: 'VISEL-LA',
    url: `${OCP_RAW_BASE}VisEl.xml`, kind: 'ocp-xml', maxChapter: 1, language: 'la', versionLanguage: 'Latin',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-edition',
    notes: 'شاهد لاتيني من طبعة دي بروين 1925، مستقل عن النص اليوناني الآخر المعروف برؤيا إيليا.'
  },
  {
    bookCode: 'VISEL', slug: 'en-project-vision-elijah-latin',
    nameAr: 'ترجمة إنجليزية لشاهد رؤيا إيليا اللاتيني', nameEn: 'Project English Translation of the Latin Vision of Elijah', abbreviation: 'VISEL-EN',
    url: `${OCP_RAW_BASE}VisEl.xml`, kind: 'reviewed-unit-text-file', maxChapter: 1, incomplete: false, language: 'en', versionLanguage: 'English',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-translation',
    textFile: new URL('./data/vision_elijah_latin_project_english.json', import.meta.url),
    expectedSha256: 'eb82decc7bd908894dcb51a2974ef0fe13f40bd13da84388751a18032eb7ab83',
    expectedUnitCount: 11, expectedWordCount: 220,
    notes: 'ترجمة إنجليزية جديدة أعدها المشروع مباشرة عن وحدات شاهد OCP اللاتيني الكامل الإحدى عشرة؛ حُفظ اللفظ اللاتيني الملتبس بعلامة صريحة ولم يُستكمل بالتخمين. بيانات الطبعة تنسب النص إلى دي بروين 1925، المجلد 37، ص 58، الأسطر 400–417. ملفات OCP النصية متاحة بموجب تراخيص مفتوحة معلنة على موقع المشروع.'
  },
  {
    bookCode: 'NARMOS', slug: 'grc-ocp-narrative-moses-joshua',
    nameAr: 'الشاهد اليوناني لرواية موسى ويشوع', nameEn: 'OCP Greek Narrative of Moses and Joshua', abbreviation: 'NARMOS-GRC',
    url: `${OCP_RAW_BASE}NarrMois.xml`, kind: 'ocp-xml', maxChapter: 1, expectedUnits: 152, incomplete: true, language: 'grc', versionLanguage: 'Greek',
    originalLanguage: 'اليونانية', sourceType: 'open-critical-edition',
    notes: 'التفريغ اليوناني الرقمي من ملف مشروع النصوص النقدية المفتوحة، المنسوب إلى طبعة فاسيلييف ١٨٩٣. يحوي المصدر ١٥٤ خانة؛ لا تحمل الخانتان ١٥ و١٢٤ إلا علامة حاشية «2.» ونقطة منفردة، لذلك يستبعدهما المستورد بوصفهما غير نصيتين، وتبقى ١٥٢ وحدة نصية. بمقابلة الصور ظهرت أخطاء تفريغ أخرى في مواضع كثيرة؛ لذلك لا يوصف النص بأنه مضبوط على الطبعة. نصوص المشروع مرخصة بإسناد المشاع الإبداعي ٤.٠، بما يسمح بالتعديل والترجمة مع النسبة.'
  },
  {
    bookCode: 'AMRAM', slug: 'arc-ocp-visions-amram',
    nameAr: 'الشاهد الآرامي لرؤى عمرام', nameEn: 'OCP Aramaic Visions of Amram', abbreviation: 'AMRAM-ARC',
    url: `${OCP_RAW_BASE}Amram.xml`, kind: 'ocp-xml', maxChapter: 2, incomplete: true, language: 'arc', versionLanguage: 'Aramaic',
    originalLanguage: 'الآرامية', sourceType: 'open-critical-edition',
    notes: 'شاهد آرامي من مخطوطات البحر الميت في طبعة OCP؛ وحداته مجزأة ولا تمثل كتاباً متصلاً كاملاً.'
  },
  {
    bookCode: 'AMRAM', slug: 'en-ocp-visions-amram',
    nameAr: 'الترجمة الإنجليزية لرؤى عمرام', nameEn: 'OCP English Translation of Visions of Amram', abbreviation: 'AMRAM-EN',
    url: `${OCP_RAW_BASE}Amram.xml`, kind: 'ocp-xml', maxChapter: 2, incomplete: true, language: 'en', versionLanguage: 'English',
    originalLanguage: 'الآرامية', sourceType: 'open-critical-translation',
    notes: 'ترجمة OCP الإنجليزية للشواهد الآرامية المجزأة؛ تعرض منفصلة عن النص الأصلي.'
  },
  ...QUMRAN_AMRAM_SOURCES,
  {
    bookCode: 'CONFESD', slug: 'la-ocp-confession-esdras',
    nameAr: 'الشاهد اللاتيني لاعتراف عزرا', nameEn: 'OCP Latin Confession of Esdras', abbreviation: 'CONFESD-LA',
    url: `${OCP_RAW_BASE}ConfEsdr.xml`, kind: 'ocp-xml', maxChapter: 1, chapterOffset: -7, replaceExistingVerses: true, language: 'la', versionLanguage: 'Latin',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-edition',
    notes: 'نص لاتيني قصير من طبعة بنسلي 1895، وهو عزرا الثاني ٨:٢٠–٣٦ معروض كعمل مستقل في فصل واحد؛ تُحفظ أرقام الأعداد الأصلية ٢٠–٣٦. لا يخلط مع كلمة ورؤيا عزرا.'
  },
  {
    bookCode: 'CONFESD', slug: 'en-web-confession-esdras',
    nameAr: 'الشاهد الإنجليزي الموازي لاعتراف عزرا من البيبل العالمي الكلاسيكي', nameEn: 'WEB Classic parallel text for Confessio Esdrae', abbreviation: 'CONFESD-EN-WEB',
    url: 'https://ebible.org/Scriptures/eng-web_vpl.zip', kind: 'reviewed-unit-text-file',
    textFile: new URL('./data/confessio_esdras_web_classic.json', import.meta.url),
    expectedSha256: '8f81ed51a338d561fa2a56216aa0ccec24addfe591e60003ed64c65c43109d09',
    expectedWordCount: 369, expectedUnitCount: 17, expectedFirstVerse: 20, maxChapter: 1,
    language: 'en', versionLanguage: 'English', sourceType: 'public-domain-parallel-translation',
    notes: 'مقطع إنجليزي من World English Bible Classic، 4 Esdras 8:20–36، محفوظ كترجمة موازية لاعتراف عزرا مع إبقاء الأعداد ٢٠–٣٦. لا يُدّعى أنه ترجمة حرفية مستقلة للشاهد اللاتيني الليتورجي؛ إنه المقطع المقابل في نص عزرا الرابع. النص ملك عام، ومصدره يسمح بإعادة النشر والتوزيع. المصدر الرقمي: eng-web_vpl.zip؛ بيان الحقوق: https://www.ebible.org/eng-web/copyright.htm.'
  },
  {
    bookCode: 'VISZEZRA', slug: 'en-ocp-latin-vision-ezra',
    nameAr: 'الترجمة الإنجليزية لرؤيا عزرا اللاتينية', nameEn: 'OCP English Vision of Ezra (Latin witness)', abbreviation: 'VISZEZRA-EN',
    url: `${OCP_RAW_BASE}Esdl.xml`, kind: 'ocp-flat-xml', maxChapter: 1, expectedUnits: 113, language: 'en', versionLanguage: 'English',
    originalLanguage: 'اللاتينية', sourceType: 'open-critical-translation',
    notes: 'ترجمة OCP الإنجليزية للشاهد اللاتيني في الطبعة الرقمية النقدية لرؤيا عزرا. النص المنشور يتضمن 113 وحدة مرقمة في فصل واحد وينتهي بعبارة الختام؛ أرقام الوحدات الأصلية محفوظة مع وجود أربع قفزات في الترقيم (17 و42 و65 و66) كما في ملف الطبعة. وحدات اللاتينية والإنجليزية متطابقة في الترقيم؛ لا تدل القفزات وحدها على نص مفقود. مستودع OCP مرخص بنسبة العمل للمصدر 4.0.'
  },
  {
    bookCode: 'APEZRA', slug: 'en-walker-greek-apocalypse-ezra-1885',
    nameAr: 'ترجمة ووكر الإنجليزية لرؤيا عزرا اليونانية',
    nameEn: 'A. Walker English Greek Apocalypse of Ezra', abbreviation: 'APEZRA-EN-ANF',
    url: 'https://www.tertullian.org/fathers2/ANF-08/anf08-106.htm', kind: 'reviewed-text-file',
    textFile: new URL('./texts/greek-apocalypse-ezra-walker-anf-1885.txt', import.meta.url),
    expectedSha256: '856efa5eac8c34e65c010248bf4abd3cd556f6e9f87ed1e38dbfebecaa31ab53',
    expectedWordCount: 3297, maxChapter: 1,
    language: 'en', originalLanguage: 'اليونانية', sourceType: 'public-domain-text', siteScope: 'both',
    notes: 'ترجمة أ. ووكر الإنجليزية في آباء ما قبل نيقية، المجلد الثامن، طبعة ١٨٨٥، الصفحات ٥٧١–٥٧٤؛ النص الرقمي من نسخة الطبعة المنشورة لدى ترتليان. الترجمة مبنية على نص تيشندورف اليوناني، وتحفظ هنا كشاهد إنجليزي مستقل في فصل واحد لأن الطبعة لا تقسمه إلى فصول أو أعداد. لا تدّعي هذه الترجمة مطابقة سطرية لتقسيم OCP الحديث؛ النص الإنجليزي الكامل المتاح محفوظ من دون حواشي الطبعة.'
  }
];

export function parseOcpChapters(xml, source) {
  const versionLanguage = source.versionLanguage || (source.language === 'gez' ? 'Ethiopic' : 'Latin');
  const versions = [...xml.matchAll(new RegExp(`<version\\b[^>]*language="${versionLanguage}"[\\s\\S]*?<\\/version>`, 'gi'))];
  const version = versions[source.versionIndex || 0]?.[0];
  if (!version) throw new Error(`لم يُعثر على النسخة اللغوية في ${source.slug}`);
  const textStart = version.indexOf('<text>');
  if (textStart < 0) throw new Error(`لم يُعثر على قسم النص في ${source.slug}`);
  const body = version.slice(textStart);
  const tokenPattern = /<div\s+number="(\d+)"\s*>|<\/div\s*>|<unit\b[^>]*>|<\/unit\s*>|<reading\b([^>]*)>([\s\S]*?)<\/reading\s*>/gi;
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
      const selected = source.readingMss
        ? currentUnitReadings.find((reading) => reading.mss.split(/\s+/).includes(source.readingMss))
        : currentUnitReadings.find((reading) => reading.option === 0) || currentUnitReadings[0];
      if (source.readingMss && !selected) {
        throw new Error(`لم يُعثر على الشاهد ${source.readingMss} في ${source.slug}`);
      }
      if (selected) currentParts.push(decodeHtml(selected.text));
      currentUnitReadings = [];
      continue;
    }
    if (match[2] !== undefined) {
      const option = match[2].match(/\boption="(\d+)"/i)?.[1];
      const mss = match[2].match(/\bmss="([^"]*)"/i)?.[1] || '';
      currentUnitReadings.push({ option: option === undefined ? null : Number(option), mss, text: match[3] });
    }
  }
  const chaptersSeen = new Set(chapters.map((row) => row.chapter));
  if (chaptersSeen.size !== source.maxChapter) {
    throw new Error(`اكتُشف ${chaptersSeen.size} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  if (source.expectedUnits && chapters.length !== source.expectedUnits) {
    throw new Error(`اكتُشفت ${chapters.length} وحدة فقط في ${source.slug}، والمتوقع ${source.expectedUnits}`);
  }
  return chapters;
}

function parseOcpFlatChapter(xml, source) {
  const versions = [...xml.matchAll(new RegExp(`<version\\b[^>]*language="${source.versionLanguage}"[\\s\\S]*?<\\/version>`, 'gi'))];
  const version = versions[source.versionIndex || 0]?.[0];
  if (!version) throw new Error(`لم يُعثر على النسخة اللغوية في ${source.slug}`);
  const start = version.indexOf('<div number="Document Body">');
  const explicit = version.indexOf('<div number="Explicit">', start);
  if (start < 0 || explicit < 0) throw new Error(`لم يُعثر على متن الفصل وخاتمته في ${source.slug}`);
  const body = version.slice(start, explicit);
  const chapters = [...body.matchAll(/<div\s+number="(\d+)"\s*>([\s\S]*?)<\/div\s*>/gi)].map((match) => {
    const unit = match[2].match(/<unit\b[^>]*>([\s\S]*?)<\/unit\s*>/i)?.[1];
    const readings = unit ? [...unit.matchAll(/<reading\b[^>]*option="(\d+)"[^>]*>([\s\S]*?)<\/reading\s*>/gi)] : [];
    const selected = readings.find((reading) => Number(reading[1]) === 0) || readings[0];
    const text = selected ? cleanText(decodeHtml(selected[2])) : '';
    return { chapter: 1, verse: Number(match[1]), text, sourceUrl: source.url };
  }).filter((row) => row.text.length > 2);
  if (chapters.length !== source.expectedUnits) {
    throw new Error(`اكتُشف ${chapters.length} وحدة فقط في ${source.slug}، والمتوقع ${source.expectedUnits}`);
  }
  const witnessVersion = [...xml.matchAll(/<version\b[^>]*>[\s\S]*?<\/version>/gi)][0]?.[0];
  const witnessStart = witnessVersion?.indexOf('<div number="Document Body">') ?? -1;
  const witnessEnd = witnessVersion?.indexOf('<div number="Explicit">', witnessStart) ?? -1;
  const witnessNumbers = witnessStart >= 0 && witnessEnd > witnessStart
    ? [...witnessVersion.slice(witnessStart, witnessEnd).matchAll(/<div\s+number="(\d+)"\s*>/gi)].map((match) => Number(match[1]))
    : [];
  if (witnessNumbers.length !== chapters.length || witnessNumbers.some((number, index) => number !== chapters[index].verse)) {
    throw new Error(`لا تتطابق وحدات الإنجليزية مع ترقيم الشاهد اللاتيني في ${source.slug}`);
  }
  if (!version.includes('HERE ENDS THE LEGEND OF THE BLESSED PROPHET EZRA')) {
    throw new Error(`لا تظهر خاتمة الشاهد في ${source.slug}`);
  }
  return chapters;
}

function parseIntertextualBookSections(content, source) {
  const sections = [...content.matchAll(/<section\b(?=[^>]*class="[^"]*\bchapter-section\b")(?=[^>]*data-chapter="(\d+)")[^>]*>([\s\S]*?)<\/section>/gi)];
  if (sections.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${sections.length} فصلاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  const chapters = [];
  for (const section of sections) {
    const chapter = Number(section[1]);
    const verses = [...section[2].matchAll(/<span\b(?=[^>]*class="[^"]*\bverse-span\b")(?=[^>]*data-verse="(\d+):(\d+)")[^>]*>([\s\S]*?)<\/span>/gi)];
    if (!verses.length) throw new Error(`لا توجد وحدات نصية في الفصل ${chapter} من ${source.slug}`);
    for (const verse of verses) {
      const parsedChapter = Number(verse[1]);
      const number = Number(verse[2]);
      const text = cleanText(decodeHtml(verse[3].replace(/<[^>]+>/g, ' ')));
      if (parsedChapter !== chapter || text.length < 10) throw new Error(`وحدة غير صالحة في الفصل ${chapter} من ${source.slug}`);
      chapters.push({ chapter, verse: number, text, sourceUrl: source.url });
    }
  }
  return chapters;
}

async function parseIntertextualPagedChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const content = await fetchText(`${source.url}/${chapter}`);
    const section = content.match(new RegExp(`<section\\b(?=[^>]*class="[^"]*\\bchapter-section\\b")(?=[^>]*data-chapter="${chapter}")[^>]*>([\\s\\S]*?)<\\/section>`, 'i'))?.[1];
    if (!section) throw new Error(`لم يُعثر على الفصل ${chapter} في ${source.slug}`);
    const verses = [...section.matchAll(/<span\b(?=[^>]*class="[^"]*\bverse-span\b")(?=[^>]*data-verse="(\d+):(\d+)")[^>]*>([\s\S]*?)<\/span>/gi)];
    if (!verses.length) throw new Error(`لا توجد وحدات في الفصل ${chapter} من ${source.slug}`);
    for (const verse of verses) {
      const parsedChapter = Number(verse[1]);
      const number = Number(verse[2]);
      const text = cleanText(decodeHtml(verse[3].replace(/<[^>]+>/g, ' ')));
      if (parsedChapter !== chapter || text.length < 5) throw new Error(`وحدة غير صالحة في الفصل ${chapter} من ${source.slug}`);
      chapters.push({ chapter, verse: number, text, sourceUrl: `${source.url}/${chapter}` });
    }
  }
  return chapters;
}

export function parseActsThomas(content, source) {
  const start = content.indexOf('The First Act:');
  const end = content.lastIndexOf('</blockquote>');
  if (start < 0 || end < 0) throw new Error('لم توجد حدود نص أعمال توما');
  // The first heading opens before start; begin with its following paragraph.
  const section = content.slice(content.indexOf('</p>', start) + 4, end);
  const isPartTitle = (text) => /^(?:The \w+ Act:|Act the Third:|\[THE MARTYRDOM)/.test(text);
  const allParagraphs = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => stripHtml(match[1]));
  const titles = [stripHtml(content.slice(start, content.indexOf('</p>', start))), ...allParagraphs.filter(isPartTitle)];
  if (titles.length !== 14) throw new Error('عناوين أجزاء أعمال توما غير مكتملة');
  const paragraphs = allParagraphs.filter((text) => text && !isPartTitle(text));
  let plain = '1 ' + paragraphs.join('\n').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  for (const number of [7, 32, 43, 45, 48]) {
    plain = plain.replace(new RegExp(` ${number} (?=And|What|Jesu)`), `\n${number} `);
  }
  const headings = [...plain.matchAll(/(?:^|\n)(\d+)\.?\s+/g)];
  if (headings.length !== 170 || headings.some((m, i) => Number(m[1]) !== i + 1)) {
    throw new Error('أعمال توما لا تحتوي تسلسلاً كاملاً من ١ إلى ١٧٠');
  }
  if (!plain.includes('The acts of Judas Thomas the apostle are completed')) throw new Error('خاتمة أعمال توما مفقودة');
  const starts = [1, 17, 30, 39, 42, 51, 62, 68, 82, 119, 134, 139, 150, 159];
  return headings.map((heading, index) => {
    const number = Number(heading[1]);
    let text = cleanText(plain.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? plain.length));
    if (text.length < 40) throw new Error(`قسم أعمال توما ${number} قصير`);
    const chapter = starts.filter((start) => start <= number).length;
    if (number === starts[chapter - 1]) text = titles[chapter - 1] + '\n\n' + text;
    return { chapter, verse: number, text, sourceUrl: source.url };
  });
}

async function parseChapters(content, source) {
  if (source.kind === 'reviewed-text-file') return parseReviewedText(content, source);
  if (source.kind === 'reviewed-chapter-text-file') return parseReviewedChapterText(content, source);
  if (source.kind === 'reviewed-unit-text-file') return parseReviewedUnitText(content, source);
  if (source.kind === 'complete-letter-html') {
    const body = content.split(/<h[1-6]\b[^>]*>\s*About this page\s*<\/h[1-6]>/i)[0];
    const headings = [...body.matchAll(/<h[1-6]\b[^>]*>\s*Chapter\s+(\d+)\.([\s\S]*?)<\/h[1-6]>/gi)];
    if (headings.length !== source.maxChapter || headings.some((m, i) => Number(m[1]) !== i + 1)) throw new Error(`فصول الرسالة غير مكتملة في ${source.slug}`);
    const paragraphs = (section) => [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1])).filter(Boolean).join('\n\n');
    const greetingStart = body.search(/<h[1-6]\b[^>]*>Greeting<\/h[1-6]>/i);
    if (greetingStart < 0) throw new Error(`تحية الرسالة مفقودة في ${source.slug}`);
    const greeting = paragraphs(body.slice(greetingStart, headings[0].index));
    return headings.map((m, i) => {
      const text = [i === 0 ? greeting : '', stripHtml(m[0]), paragraphs(body.slice(m.index + m[0].length, headings[i+1]?.index ?? body.length))].filter(Boolean).join('\n\n');
      if (text.length < 40) throw new Error(`فصل الرسالة ${i+1} فارغ في ${source.slug}`);
      return {chapter: i + 1, verse: 1, text, sourceUrl: source.url};
    });
  }
  if (source.kind === 'epistle-apostles-html') {
    const sanitized = content.replace(/\sdata-[\w-]+=(?:"[^"]*"|'[^']*')/gi, '').replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const paragraphs = [...sanitized.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1]).replace(/[\u200b\ufeff]/g, '').trim());
    const start = paragraphs.findIndex((p) => /^1 The book which Jesus Christ/.test(p));
    const end = paragraphs.findIndex((p, i) => i > start && p === 'Footnotes');
    if (start < 0 || end < 0) throw new Error('حدود نص رسالة الرسل غير متاحة');
    let plain = paragraphs.slice(start, end).join('\n').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
    for (const n of [41, 43, 44]) plain = plain.replace(new RegExp(` ${n} (?=He|And|On)`), `\n${n} `);
    const headings = [...plain.matchAll(/(?:^|\n)(\d+)\s+/g)];
    if (headings.length !== 51 || headings.some((m, i) => Number(m[1]) !== i + 1)) throw new Error('فصول رسالة الرسل غير مكتملة');
    return headings.map((m, i) => ({chapter: i + 1, verse: 1, text: cleanText(plain.slice(m.index + m[0].length, headings[i+1]?.index ?? plain.length)), sourceUrl: source.url}));
  }
  if (source.kind === 'strict-numbered-paragraphs') {
    const sanitized = content.replace(/\sdata-[\w-]+=(?:"[^"]*"|'[^']*')/gi, '');
    const rows = [...sanitized.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripHtml(m[1]).replace(/[\u200b\ufeff]/g, '').trim().match(/^(\d+)\s+([\s\S]+)$/))
      .filter(Boolean).map((m) => ({chapter: 1, verse: Number(m[1]), text: m[2], sourceUrl: source.url}));
    if (rows.length !== source.maxUnits || rows.some((row, i) => row.verse !== i + 1 || !row.text.trim())) throw new Error(`تسلسل الأعداد غير مكتمل في ${source.slug}`);
    return rows;
  }
  if (source.kind === 'acts-thomas-html') return parseActsThomas(content, source);
  if (source.kind === 'structured-html') return parseStructuredHtmlChapters(source);
  if (source.kind === 'ertale-chapter-html') return parseErtaleChapteredHtml(source);
  if (source.kind === 'sacredthings-html') return parseSacredThingsChapters(source);
  if (source.kind === 'tau-ethiopic-html') return parseTauEthiopicChapters(source);
  if (source.kind === 'wikisource-api') return parseWikisourceChapters(content, source);
  if (source.kind === 'wikisource-book-api') return parseWikisourceBookChapters(content, source);
  if (source.kind === 'wikisource-collection') return parseWikisourceCollectionChapters(source);
  if (source.kind === 'wikisource-jasher') return parseWikisourceJasherChapters(source);
  if (source.kind === 'diatessaron-wikisource') return parseDiatessaronWikisource(source);
  if (source.kind === 'odes-solomon-wikisource') return parseOdesSolomonWikisource(content, source);
  if (source.kind === 'pseudepigrapha-html') return parsePseudepigraphaChapters(content, source);
  if (source.kind === 'intertextual-book-sections-html') return parseIntertextualBookSections(content, source);
  if (source.kind === 'intertextual-paged-chapters-html') return parseIntertextualPagedChapters(source);
  if (source.kind === 'pseudepigrapha-chapter-html') return parsePseudepigraphaChapterHtml(content, source);
  if (source.kind === 'enoch3-collection') return parseEnoch3Chapters(source);
  if (source.kind === 'pseudepigrapha-two-column-html') return parsePseudepigraphaTwoColumnChapters(content, source);
  if (source.kind === 'pseudepigrapha-hdf-column-html') return parsePseudepigraphaHdfColumnChapters(content, source);
  if (source.kind === 'firmament-joseph-aseneth-html') return parseFirmamentJosephAsenethChapters(content, source);
  if (source.kind === 'vita-adae-eve-html') return parseVitaAdaeEveChapters(content, source);
  if (source.kind === 'pseudepigrapha-single-html') return parsePseudepigraphaSingleHtml(content, source);
  if (source.kind === 'new-advent-numbered-sections-html') return parseNewAdventNumberedSections(content, source);
  if (source.kind === 'apocalypse-moses-html') return parseApocalypseMosesHtml(content, source);
  if (source.kind === 'apocryphon-ezekiel-fragments-html') return parseApocryphonEzekielFragments(content, source);
  if (source.kind === 'wikisource-rendered-collection') return parseRenderedWikisourceCollectionChapters(source);
  if (source.kind === 'other-gospels-json') return parseOtherGospelsJson(content, source);
  if (source.kind === 'testament-solomon-wikisource-html') return parseTestamentSolomonWikisource(content, source);
  if (source.kind === 'chaptered-html') return parseChapteredHtml(content, source);
  if (source.kind === 'chaptered-paragraph-html') return parseChapteredParagraphHtml(content, source);
  if (source.kind === 'wikisource-roman-chapter-html') return parseWikisourceRomanChapterHtml(content, source);
  if (source.kind === 'gospel-thomas-sayings-html') return parseThomasSayingsHtml(content, source);
  if (source.kind === 'earlychristian-gospel-mary-html') return parseEarlyChristianGospelMaryHtml(content, source);
  if (source.kind === 'earlychristian-fragment-html') return parseEarlyChristianFragmentHtml(content, source);
  if (source.kind === 'gospels-net-paragraph-html') return parseGospelsNetParagraphHtml(content, source);
  if (source.kind === 'new-advent-chaptered-html') return parseNewAdventChapteredHtml(content, source);
  if (source.kind === 'wikisource-numbered-paragraphs') return parseWikisourceNumberedParagraphs(content, source);
  if (source.kind === 'new-advent-version-html') return parseNewAdventVersionChapters(content, source);
  if (source.kind === 'wesley-testament-html') return parseWesleyTestamentChapters(content, source);
  if (source.kind === 'viachrista-html') return parseViaChristaChapters(content, source);
  if (source.kind === 'ocp-xml') return parseOcpChapters(content, source);
  if (source.kind === 'ocp-flat-xml') return parseOcpFlatChapter(content, source);
  if (source.kind === 'numbered-html-chapters') return parseNumberedHtmlChapters(content, source);
  if (source.kind === 'roman-html-chapters') return parseRomanHtmlChapters(content, source);
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

function parseNumberedHtmlChapters(content, source) {
  const body = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || content;
  const plain = decodeHtml(body.replace(/<\/(?:p|h[1-6]|tr|td|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '));
  const candidates = [...plain.matchAll(/(?:^|\n)\s*CHAPTER\s+([IVXLCDM]+)\s*\./gim)];
  const headings = candidates.filter((heading, index) => {
    const previous = candidates[index - 1];
    if (!previous || previous[1].toUpperCase() !== heading[1].toUpperCase()) return true;
    const between = plain.slice(previous.index + previous[0].length, heading.index).trim();
    return between.length >= 20;
  });
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} عنوان فصل فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return headings.map((heading, index) => {
    const sectionStart = heading.index + heading[0].length;
    const sectionEnd = headings[index + 1]?.index ?? plain.length;
    const text = cleanText(plain.slice(sectionStart, sectionEnd));
    if (text.length < 40) throw new Error(`نص الفصل ${index + 1} قصير في ${source.slug}`);
    return { chapter: index + 1, verse: 1, text, sourceUrl: source.url };
  });
}

function parseRomanHtmlChapters(content, source) {
  const body = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || content;
  const rows = [];
  for (const paragraph of body.matchAll(/<p\b[^>]*>\s*([IVXLCDM]+)\.\s+([\s\S]*?)<\/p>/gi)) {
    const number = romanToNumber(paragraph[1].toUpperCase());
    if (number < 1 || number > source.maxChapter) continue;
    const text = stripHtml(paragraph[2]);
    if (text.length > 20) rows.push({ chapter: number, verse: 1, text, sourceUrl: source.url });
  }
  const seen = new Set(rows.map((row) => row.chapter));
  if (seen.size !== source.maxChapter) {
    throw new Error(`اكتُشفت ${seen.size} فصول فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return rows.sort((a, b) => a.chapter - b.chapter);
}

export async function run(requestedSlugs = null, { initializeDatabase = true } = {}) {
  const onlySlugs = requestedSlugs === null
    ? process.argv.flatMap((argument) => argument.startsWith('--only=') ? argument.slice('--only='.length).split(',') : []).map((slug) => slug.trim()).filter(Boolean)
    : requestedSlugs.map((slug) => String(slug).trim()).filter(Boolean);
  const declaredSources = [...SOURCES, ...ADDITIONAL_SOURCES];
  const blockedSlugs = onlySlugs.filter((slug) => declaredSources.some((source) => source.slug === slug && source.importEligible === false));
  if (blockedSlugs.length) throw new Error(`مصادر لم يثبت إذن إعادة نشرها: ${blockedSlugs.join(', ')}`);
  const allSources = declaredSources.filter((source) => source.importEligible !== false);
  const selectedSources = onlySlugs.length ? allSources.filter((source) => onlySlugs.includes(source.slug)) : allSources;
  const unknownSlugs = onlySlugs.filter((slug) => !selectedSources.some((source) => source.slug === slug));
  if (unknownSlugs.length) throw new Error(`مصادر غير معروفة: ${unknownSlugs.join(', ')}`);
  if (initializeDatabase) {
    initDatabase();
    initBibleSchema();
  }
  const db = getDb();
  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language,
      source_url=excluded.source_url, source_type=excluded.source_type, source_notes=excluded.source_notes,
      site_scope=excluded.site_scope, is_active=1
  `);
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertBookSource = db.prepare(`
    INSERT INTO bible_book_sources
      (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES (?, ?, ?, ?, 'available', ?, ?, ?)
    ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
      label_en=excluded.label_en, availability_status='available',
      source_type=excluded.source_type, notes=excluded.notes
  `);
  const insertMany = db.transaction((rows, replaceExisting) => {
    if (replaceExisting) {
      db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=?').run(...replaceExisting);
    }
    rows.forEach((row) => insertVerse.run(...row));
  });
  const legacyEthiopic = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('gez-ocp-enoch');
  if (legacyEthiopic) {
    db.prepare('UPDATE bible_translations SET is_active=0 WHERE id=?').run(legacyEthiopic.id);
  }

  for (const [index, source] of selectedSources.entries()) {
    insertTranslation.run(
      source.slug, source.nameAr, source.nameEn, source.abbreviation,
      source.language, source.url, source.sourceType, source.notes, source.siteScope || 'both', 40 + index
    );
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id;
    const content = ['reviewed-text-file', 'reviewed-chapter-text-file', 'reviewed-unit-text-file'].includes(source.kind)
      ? await readFile(source.textFile, 'utf8')
      : ['structured-html', 'sacredthings-html', 'ertale-chapter-html', 'diatessaron-wikisource', 'intertextual-paged-chapters-html'].includes(source.kind)
        ? null
        : await fetchText(source.url);
    const parsedChapters = await parseChapters(content, source);
    const rows = parsedChapters.map((chapter) => [
      translationId, source.bookCode, chapter.chapter + (source.chapterOffset || 0), chapter.verse, chapter.text,
      normalizeArabicText(chapter.text), chapter.sourceUrl || source.url
    ]);
    insertMany(rows, source.replaceExistingVerses ? [translationId, source.bookCode] : null);
    db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code=?')
      .run(source.maxChapter, source.maxChapter, source.bookCode);
    db.prepare(`
      UPDATE bible_book_metadata
      SET text_status=CASE WHEN ?=1 THEN 'partial' ELSE 'complete' END, original_language=COALESCE(NULLIF(?, ''), original_language),
          english_status=CASE WHEN ?='en' THEN 'available' ELSE english_status END,
          source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(source.incomplete ? 1 : 0, source.originalLanguage || '', source.language, source.nameEn, source.url, source.notes, source.bookCode);
    insertBookSource.run(source.bookCode, source.nameAr, source.nameEn, source.language, source.sourceType, source.url, source.notes);
    db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(translationId);
    console.log(`[Bible] ${source.slug}: ${new Set(parsedChapters.map((row) => row.chapter)).size} إصحاحاً، ${rows.length} وحدة`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error('[Bible noncanonical import]', error.message);
    process.exit(1);
  });
}
