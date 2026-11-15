/**
 * الأسماء العربية المتعارفة للأسفار وأسماؤها البديلة.
 *
 * - name_ar: الاسم المعتمد للعرض، ويُكتب بحسب ما تعارف عليه العرب. إن كان للسفر ترقيمان (اللاتيني واليوناني) كُتب الاثنان معاً،
 *   مثل «عزرا الرابع (إسدراس الثاني)».
 * - aliases: أسماء أخرى يُعرف بها السفر عند الكنائس والمؤلفين، ويُعثر عليه بها في صندوق الانتقال وفي قراءة المراجع.
 *   لا حاجة لتكرار صيغ الهمزة والتاء المربوطة والتشكيل، فالبحث يوحّدها.
 * يبقى الاسم القديم للسفر اسماً بديلاً تلقائياً إذا تغيّر الاسم المعتمد.
 */

export const BOOK_NAME_OVERRIDES = {
  // ───── العهد القديم ─────
  GEN: { aliases: ['سفر التكوين', 'تكوين'] },
  EXO: { aliases: ['سفر الخروج', 'خروج'] },
  LEV: { aliases: ['الأحبار', 'سفر الأحبار', 'سفر اللاويين', 'لاويين'] },
  NUM: { aliases: ['سفر العدد', 'عدد'] },
  DEU: { aliases: ['تثنية الاشتراع', 'سفر التثنية', 'تثنية'] },
  JOS: { aliases: ['يشوع بن نون', 'سفر يشوع'] },
  JDG: { aliases: ['سفر القضاة', 'قضاة'] },
  RUT: { aliases: ['راعوت', 'روث', 'سفر راعوث'] },
  '1SA': { aliases: ['سفر صموئيل الأول', '1 صموئيل', 'صموئيل 1'] },
  '2SA': { aliases: ['سفر صموئيل الثاني', '2 صموئيل', 'صموئيل 2'] },
  '1KI': { aliases: ['سفر الملوك الأول', '1 ملوك', 'ملوك أول'] },
  '2KI': { aliases: ['سفر الملوك الثاني', '2 ملوك', 'ملوك ثان'] },
  '1CH': { aliases: ['سفر أخبار الأيام الأول', 'الأيام الأول', '1 أخبار الأيام', 'أخبار الأيام 1'] },
  '2CH': { aliases: ['سفر أخبار الأيام الثاني', 'الأيام الثاني', '2 أخبار الأيام', 'أخبار الأيام 2'] },
  EZR: { aliases: ['سفر عزرا'] },
  NEH: { aliases: ['سفر نحميا', 'نحميّا'] },
  EST: { aliases: ['إستير', 'أستر', 'سفر أستير'] },
  JOB: { aliases: ['سفر أيوب', 'أيّوب'] },
  PSA: { aliases: ['مزامير', 'سفر المزامير', 'المزمور', 'الزبور', 'مزامير داود'] },
  PRO: { aliases: ['أمثال', 'أمثال سليمان', 'سفر الأمثال'] },
  ECC: { aliases: ['جامعة', 'سفر الجامعة', 'قوهلت', 'كوهيليت'] },
  SNG: { aliases: ['نشيد الإنشاد', 'نشيد سليمان', 'سفر نشيد الأناشيد'] },
  ISA: { aliases: ['أشعيا', 'أشعياء', 'سفر إشعياء', 'إشعيا'] },
  JER: { aliases: ['أرميا', 'إرمياء', 'سفر إرميا'] },
  LAM: { aliases: ['المراثي', 'مراثي', 'سفر المراثي'] },
  EZK: { aliases: ['سفر حزقيال', 'حزقيئيل'] },
  DAN: { aliases: ['سفر دانيال', 'دانيآل'] },
  HOS: { aliases: ['سفر هوشع'] },
  JOL: { aliases: ['يوايل', 'سفر يوئيل'] },
  AMO: { aliases: ['سفر عاموس'] },
  OBA: { aliases: ['عوبيديا', 'عبديا', 'سفر عوبديا'] },
  JON: { aliases: ['يونس', 'سفر يونان', 'يونس بن متى'] },
  MIC: { aliases: ['ميخا', 'سفر ميخا'] },
  NAM: { aliases: ['نحوم', 'سفر ناحوم'] },
  HAB: { aliases: ['حبقّوق', 'سفر حبقوق'] },
  ZEP: { aliases: ['صفنيّا', 'سفر صفنيا'] },
  HAG: { aliases: ['حجاي', 'حجّاي', 'سفر حجي'] },
  ZEC: { aliases: ['زكريّا', 'زخريا', 'سفر زكريا'] },
  MAL: { aliases: ['ملاخيا', 'ملاكي', 'سفر ملاخي'] },

  // ───── العهد الجديد ─────
  MAT: { aliases: ['إنجيل متى', 'متّى'] },
  MRK: { aliases: ['إنجيل مرقس', 'مرقص'] },
  LUK: { aliases: ['إنجيل لوقا', 'لوقا'] },
  JHN: { aliases: ['إنجيل يوحنا'] },
  ACT: { aliases: ['الأعمال', 'أعمال', 'سفر أعمال الرسل'] },
  ROM: { aliases: ['رسالة رومية', 'الرومانيين', 'أهل رومية'] },
  '1CO': { aliases: ['رسالة كورنثوس الأولى', '1 كورنثوس', 'قورنتس الأولى'] },
  '2CO': { aliases: ['رسالة كورنثوس الثانية', '2 كورنثوس', 'قورنتس الثانية'] },
  GAL: { aliases: ['غلاطيا', 'الغلاطيين', 'رسالة غلاطية'] },
  EPH: { aliases: ['الأفسسيين', 'رسالة أفسس', 'أهل أفسس'] },
  PHP: { aliases: ['فيلبّي', 'فيليبي', 'الفيلبيين'] },
  COL: { aliases: ['قولسي', 'أهل كولوسي', 'رسالة كولوسي'] },
  '1TH': { aliases: ['تسالونيقي الأولى', '1 تسالونيكي', 'التسالونيكيين الأولى'] },
  '2TH': { aliases: ['تسالونيقي الثانية', '2 تسالونيكي', 'التسالونيكيين الثانية'] },
  '1TI': { aliases: ['طيموثاوس الأولى', '1 تيموثاوس', 'تيموثاوس الأول'] },
  '2TI': { aliases: ['طيموثاوس الثانية', '2 تيموثاوس', 'تيموثاوس الثاني'] },
  TIT: { aliases: ['طيطس', 'تيتس', 'رسالة تيطس'] },
  PHM: { aliases: ['فليمون', 'رسالة فيلمون'] },
  HEB: { aliases: ['عبرانيين', 'الرسالة إلى العبرانيين'] },
  JAS: { aliases: ['رسالة يعقوب'] },
  '1PE': { aliases: ['رسالة بطرس الأولى', '1 بطرس'] },
  '2PE': { aliases: ['رسالة بطرس الثانية', '2 بطرس'] },
  '1JN': { aliases: ['رسالة يوحنا الأولى', '1 يوحنا'] },
  '2JN': { aliases: ['رسالة يوحنا الثانية', '2 يوحنا'] },
  '3JN': { aliases: ['رسالة يوحنا الثالثة', '3 يوحنا'] },
  JUD: { aliases: ['رسالة يهوذا', 'يوذا'] },
  REV: { aliases: ['رؤيا يوحنا', 'رؤيا يوحنا اللاهوتي', 'سفر الرؤيا', 'الأبوكاليبس', 'الرؤية'] },

  // ───── الأسفار القانونية الثانية ─────
  TOB: { aliases: ['طوبيت', 'طوبيّا', 'سفر طوبيا', 'Tobit'] },
  JDT: { aliases: ['يهوديث', 'سفر يهوديت', 'Judith'] },
  '1MA': { aliases: ['المكابيون الأول', '1 مكابيين', 'المقابيين الأول', '1 Maccabees'] },
  '2MA': { aliases: ['المكابيون الثاني', '2 مكابيين', 'المقابيين الثاني', '2 Maccabees'] },
  WIS: { aliases: ['حكمة سليمان', 'سفر الحكمة', 'Wisdom'] },
  SIR: { aliases: ['حكمة يشوع بن سيراخ', 'حكمة ابن سيراخ', 'سفر ابن سيراخ', 'Sirach', 'Ecclesiasticus'] },
  BAR: { aliases: ['سفر باروخ', 'رسالة إرميا', 'Baruch'] },
  // عزرا الأول والثاني في «الأسفار القانونية الثانية» هما إسدراس الأول والثاني بالترقيم اليوناني/السلافي،
  // وعزرا الثالث والرابع بالترقيم اللاتيني؛ ولا يُخلط أيٌّ منهما بسفر عزرا ولا بنحميا.
  '1ES': {
    name_ar: 'عزرا الثالث (إسدراس الأول)',
    aliases: ['إسدراس الأول', 'اسدراس الأول', 'عزرا الثالث', '3 عزرا', '1 إسدراس', 'سفر إسدراس الأول', '1 Esdras', '3 Ezra']
  },
  '2ES': {
    name_ar: 'عزرا الرابع (إسدراس الثاني)',
    aliases: ['إسدراس الثاني', 'اسدراس الثاني', 'عزرا الرابع', '4 عزرا', '2 إسدراس', 'إسدراس الرابع', 'سفر عزرا الرابع', 'سفر إسدراس الثاني', 'رؤيا عزرا', '2 Esdras', '4 Ezra']
  },
  MAN: { aliases: ['صلاة منسّى', 'صلاة منشا', 'صلاة ملك يهوذا منسى', 'Prayer of Manasseh'] },
  PS2: { aliases: ['مزمور 151', 'المزمور الحادي والخمسون بعد المئة', 'Psalm 151'] },
  '3MA': { aliases: ['المكابيون الثالث', '3 مكابيين', 'المقابيين الثالث', '3 Maccabees'] },
  '4MA': { aliases: ['المكابيون الرابع', '4 مكابيين', 'المقابيين الرابع', '4 Maccabees'] },
  DAG: {
    name_ar: 'إضافات دانيال اليونانية',
    aliases: ['دانيال اليوناني', 'تتمة دانيال', 'تتمات دانيال', 'سوسنة', 'سوسنا', 'بل والتنين', 'صلاة عزريا', 'تسبحة الفتية الثلاثة', 'Additions to Daniel', 'Susanna']
  },
  ESG: { aliases: ['تتمة أستير', 'تتمات أستير', 'أستير اليونانية', 'Additions to Esther'] },

  // ───── الأبوكريفا ─────
  ENO: { aliases: ['خنوخ', 'أنوخ', 'حنوك', 'أخنوخ الحبشي', 'سفر أخنوخ الحبشي', 'Enoch'] },
  JUB: { aliases: ['سفر اليوبيلات', 'اليوبيل', 'الأعياد', 'التكوين الصغير', 'لبتا جينيسيس', 'Jubilees'] },
  DID: { aliases: ['الديداخي', 'الدياخي', 'الديداكي', 'تعليم الرسل', 'تعليم الرسل الاثني عشر', 'Didache'] },
  GTH: { aliases: ['إنجيل توما', 'Gospel of Thomas'] },
  PJA: { aliases: ['إنجيل يعقوب', 'إنجيل ميلاد مريم', 'الإنجيل المنسوب ليعقوب', 'Protoevangelium of James'] },
  GNIC: { aliases: ['أعمال بيلاطس', 'إنجيل نيقوديمس', 'نيقوديموس', 'Gospel of Nicodemus'] },
  GPE: { aliases: ['Gospel of Peter'] },
  GJUD: { aliases: ['إنجيل يهوذا الإسخريوطي', 'Gospel of Judas'] },
  GMA: { aliases: ['إنجيل مريم المجدلية', 'Gospel of Mary'] },
  GTINF: { aliases: ['إنجيل الطفولة', 'إنجيل الطفولة لتوما', 'Infancy Gospel of Thomas'] },
  APOL: { aliases: ['أعمال بولس وتقلا', 'Acts of Paul'] },
  APET: { aliases: ['Acts of Peter'] },
  APEP: { aliases: ['Apocalypse of Peter'] },
  APJAMES: { aliases: ['رؤيا يعقوب', 'رؤيا يعقوب الرسول'] },
  VIRGINAP: { aliases: ['رؤيا العذراء', 'رؤيا السيدة العذراء', 'رؤيا مريم العذراء'] },
  ACTTHOM: { aliases: ['Acts of Thomas'] },
  ACTJOHN: { aliases: ['Acts of John'] },
  LAOD: { aliases: ['رسالة اللاودكيين', 'الرسالة إلى أهل لاودكية', 'لاودكية', 'Laodiceans'] },
  EPISTAP: { aliases: ['رسالة الحواريين', 'Epistle of the Apostles'] },

  // ───── التقليد الإثيوبي ─────
  '1MCE': { aliases: ['ماقبيان الأول', 'ميقابيان الأول', 'المقابيان الأول', '1 Meqabyan'] },
  '2MCE': { aliases: ['ماقبيان الثاني', 'ميقابيان الثاني', 'المقابيان الثاني', '2 Meqabyan'] },
  '3MCE': { aliases: ['ماقبيان الثالث', 'ميقابيان الثالث', 'المقابيان الثالث', '3 Meqabyan'] },
  EZRS: { aliases: ['عزرا سوتئيل', 'سوتوئيل', 'سوتئيل', 'عزرا الحبشي', 'Ezra Sutuel'] },
  TAGS: { aliases: ['تقسات', 'تيغسات', 'Tegsat'] },
  SIRE: { aliases: ['سيراخ الإثيوبي', 'ابن سيراخ الإثيوبي', 'Ethiopic Sirach'] },
  JOSB: { aliases: ['يوسيبون', 'يوسيفون', 'يوسف بن جوريون', 'جوريون', 'Josippon'] },
  SIN: { aliases: ['السنهودس', 'السنهدس', 'السينودوس', 'سينودس', 'Sinodos'] },
  COV1: { aliases: ['العهد الأول', 'Book of Covenant 1'] },
  COV2: { aliases: ['العهد الثاني', 'Book of Covenant 2'] },
  'CLE-ETH': { aliases: ['إكليمندس', 'إقليمندس', 'قليمنضس', 'كليمندس', 'Ethiopic Clement'] },

  // ───── الكتابات الكنسية ─────
  'DID-ETH': { aliases: ['الدسقولية', 'الدسقلية', 'الدسكولية'] },
  DIDAS: { aliases: ['الدسقولية', 'الدسقلية', 'تعاليم الرسل', 'Didascalia'] },
  DIAT: { aliases: ['الدياطيسارون', 'الدياطسارون', 'دياتسارون', 'دياتيسارون', 'الإنجيل الرباعي', 'Diatessaron'] },
  CLE1: { aliases: ['إكليمندس الأولى', 'رسالة إقليمندس الأولى', 'رسالة قليمنضس إلى كورنثوس', '1 Clement'] },
  CLE2: { aliases: ['إكليمندس الثانية', 'رسالة إقليمندس الثانية', '2 Clement'] },
  BARN: { aliases: ['برنابا', 'Barnabas'] },
  ODSO: { aliases: ['أناشيد سليمان', 'تسابيح سليمان', 'Odes of Solomon'] },
  HERM: { aliases: ['الراعي', 'الراعي لهرماس', 'هرماس', 'Shepherd of Hermas'] },
  IGNEPH: { aliases: ['إغناطيوس الأنطاكي إلى أفسس', 'رسالة أغناطيوس إلى أفسس'] },
  IGNMAG: { aliases: ['إغناطيوس الأنطاكي إلى مغنيسية', 'رسالة أغناطيوس إلى مغنيسية'] },
  IGNTRA: { aliases: ['إغناطيوس الأنطاكي إلى ترالس', 'رسالة أغناطيوس إلى تراليس'] },
  IGNROM: { aliases: ['إغناطيوس الأنطاكي إلى رومية', 'رسالة أغناطيوس إلى روما'] },
  IGNPHI: { aliases: ['إغناطيوس الأنطاكي إلى فيلادلفية', 'رسالة أغناطيوس إلى فيلادلفيا'] },
  IGNSMY: { aliases: ['إغناطيوس الأنطاكي إلى سميرنا', 'رسالة أغناطيوس إلى إزمير'] },
  IGNPOL: { aliases: ['إغناطيوس الأنطاكي إلى بوليكاربوس'] },
  POLPHI: { aliases: ['بوليكاربوس', 'بوليكاربوس إلى فيلبي', 'Polycarp'] },

  // ───── المنحولات والرؤى القديمة ─────
  TADAM: { aliases: ['سفر آدم وحواء', 'قصة آدم وحواء', 'Life of Adam and Eve'] },
  APMO: { aliases: ['رؤيا موسى', 'Apocalypse of Moses'] },
  APADAM: { aliases: ['Apocalypse of Adam'] },
  ADAMCON: { aliases: ['الصراع بين آدم وحواء والشيطان', 'كتاب الصراع', 'Conflict of Adam and Eve'] },
  PSLAB: { aliases: ['الأسفار المنحولة لفيلو', 'سفر العتائق', 'Pseudo-Philo'] },
  JASHER: { aliases: ['سفر ياشر', 'كتاب الأبرار', 'سفر الأبرار', 'ياشر', 'Jasher'] },
  ENO2: { aliases: ['أخنوخ السلافي', 'أسرار أخنوخ', 'سفر أسرار أخنوخ', '2 Enoch', 'Secrets of Enoch'] },
  ENO3: { aliases: ['أخنوخ العبري', 'سفر الهيكلات', '3 Enoch'] },
  SHEM: { aliases: ['سام بن نوح'] },
  TSCROLL: { aliases: ['لفافة الهيكل', 'لفافة الهيكل 11Q19', 'درج المعبد', '11Q19', '11QTa'] },
  ABR: { aliases: ['Apocalypse of Abraham'] },
  AABR: { aliases: ['Testament of Abraham'] },
  LADJAC: { aliases: ['سلم يعقوب', 'سلّم يعقوب', 'Ladder of Jacob'] },
  T12: { aliases: ['وصايا الأسباط الاثني عشر', 'وصايا الآباء', 'وصايا الأسباط', 'Testaments of the Twelve Patriarchs'] },
  JOSEPH: { aliases: ['يوسف وأسينات', 'أسنات', 'Joseph and Aseneth'] },
  TJOB: { aliases: ['Testament of Job'] },
  MOS: { aliases: ['صعود موسى', 'Assumption of Moses'] },
  'MOTA-MUSE': { aliases: ['وفاة موسى', 'موت موسى', 'موتى موسى', 'Mota Musse'] },
  TSOL: { aliases: ['Testament of Solomon'] },
  QSB: { aliases: ['أسئلة ملكة سبأ', 'ملكة سبأ'] },
  SEELI: { aliases: ['سفر إلياهو', 'كتاب إيليا', 'سفر إيليا'] },
  AHIKAR: { aliases: ['أخيقار', 'أحيقار', 'حكمة أخيقار', 'أخيقار الحكيم', 'Ahiqar'] },
  ASC: { aliases: ['رؤيا إشعياء', 'استشهاد إشعياء', 'Ascension of Isaiah'] },
  APZEPH: { aliases: ['Apocalypse of Zephaniah'] },
  '2BAR': { aliases: ['رؤيا باروخ السريانية', 'أبوكاليبس باروخ', '2 Baruch'] },
  '3BAR': { aliases: ['رؤيا باروخ اليونانية', '3 Baruch'] },
  '4BAR': { aliases: ['بقية كلمات إرميا', 'بقايا كلمات إرميا', '4 Baruch', 'Paralipomena of Jeremiah'] },
  ARIST: { aliases: ['رسالة أرستياس', 'رسالة أريستياس', 'Letter of Aristeas'] },
  PSOL: { aliases: ['Psalms of Solomon'] },
  SIBYLL: { aliases: ['الكتب السيبيلية', 'أقوال العرافة', 'العرافات السيبيلية', 'Sibylline Oracles'] },
  SEDRACH: { aliases: ['رؤيا شدراخ', 'Apocalypse of Sedrach'] },
  ZOSIMUS: { aliases: ['رواية زوسيموس', 'زوسيموس', 'Narrative of Zosimus'] },
  GIANTS: { aliases: ['كتاب الجبابرة', 'Book of Giants'] },

  // ───── الشواهد والترجمات ─────
  SAM: { aliases: ['Samaritan Pentateuch'] },
  LXX: { aliases: ['الترجمة السبعينية', 'الترجمة اليونانية', 'Septuagint'] },
  PESH: { aliases: ['البشيطا', 'البسيطا', 'الترجمة السريانية', 'Peshitta'] },
  VUL: { aliases: ['الفولغاتا', 'الفلجاتا', 'الفلغاتا', 'الترجمة اللاتينية', 'Vulgate'] },
  SAMJOS: { aliases: ['التاريخ السامري', 'كتاب يشوع السامري'] }
};

// يطبّق الأسماء المعتمدة والبديلة على الأسفار الموجودة فعلاً في القاعدة؛ ويُبقي الاسم القديم اسماً بديلاً.
export function applyBookNameOverrides(db) {
  const getName = db.prepare('SELECT name_ar FROM bible_books WHERE code=?');
  const rename = db.prepare('UPDATE bible_books SET name_ar=? WHERE code=?');
  const addAlias = db.prepare('INSERT OR IGNORE INTO bible_book_aliases (book_code, alias) VALUES (?, ?)');
  let renamed = 0;
  let aliasesAdded = 0;
  db.transaction(() => {
    for (const [code, entry] of Object.entries(BOOK_NAME_OVERRIDES)) {
      const row = getName.get(code);
      if (!row) continue;
      if (entry.name_ar && entry.name_ar !== row.name_ar) {
        rename.run(entry.name_ar, code);
        addAlias.run(code, row.name_ar);
        renamed += 1;
      }
      for (const alias of entry.aliases || []) {
        if (alias === (entry.name_ar || row.name_ar)) continue;
        aliasesAdded += addAlias.run(code, alias).changes;
      }
    }
  })();
  return { renamed, aliasesAdded };
}
