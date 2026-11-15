/**
 * جدول اعتماد الأسفار: لكل سفر منشور حالته عند كل تقليد يهودي ومسيحي.
 *
 * القاعدة: كل خلية = { s: الحالة, c: الثقة, n: ملاحظة اختيارية }.
 *  - الثقة «high»: قرار رسمي للتقليد أو إجماع بحثي موثق.
 *  - الثقة «medium»: مصادر ثانوية متسقة، دون نص رسمي حاسم.
 *  - الثقة «low»: اجتهاد أو مصادر متضاربة؛ يُعرض صراحةً ولا يُعامل كحقيقة.
 * لا يُقدَّم هنا حكم لاهوتي؛ المطلوب بيان من يقبل السفر ومن لا يقبله بحسب ما أعلنه كل تقليد أو ما توثقه الدراسات.
 */

export const CANON_STATUSES = {
  canon: { label_ar: 'قانوني', group: 'accepted', description_ar: 'ضمن قانون هذا التقليد المعتمد.' },
  canon2: { label_ar: 'قانوني ثانٍ', group: 'accepted', description_ar: 'يقرّه التقليد ضمن قانونه لكن بدرجة أو تسمية مختلفة عن الأسفار الأولى (Deuterocanonical).' },
  read: { label_ar: 'يُقرأ للعبرة', group: 'partial', description_ar: 'يُقرأ للتعليم والعبرة دون أن يُبنى عليه عقيدة (الأنجليكانية مثلاً).' },
  appendix: { label_ar: 'ملحق', group: 'partial', description_ar: 'يُطبع في ملحق الطبعة المعتمدة دون أن يُعدّ من القانون.' },
  disputed: { label_ar: 'مختلف فيه', group: 'partial', description_ar: 'يوجد في تراث التقليد، لكن حدّه القانوني غير فاصل أو متنازَع فيه داخله.' },
  oral: { label_ar: 'مرجعية شفوية', group: 'partial', description_ar: 'ليس قانوناً مكتوباً؛ هو الشريعة الشفوية المدوّنة (المشنا والتلمودان) التي يستند إليها الفقه الحاخامي.' },
  tradition: { label_ar: 'تراث موقَّر', group: 'partial', description_ar: 'أدب حاخامي موقَّر في تقليده (كالمدراش)، لكنه غير ملزم بمرتبة القانون المكتوب.' },
  attested: { label_ar: 'مشهود في قمران', group: 'historical', description_ar: 'توجد له نسخ بين مخطوطات قمران؛ ولم يكن لقمران قانون مغلق، فالحضور لا يعني الاعتماد.' },
  absent: { label_ar: 'لا شاهد قمراني', group: 'historical', description_ar: 'لا نسخة قمرانية معروفة له.' },
  witness: { label_ar: 'شاهد نصي', group: 'neutral', description_ar: 'نسخة أو ترجمة قديمة لنص، لا سفر مستقل.' },
  not: { label_ar: 'غير معتمد', group: 'rejected', description_ar: 'خارج قانون هذا التقليد.' },
  unknown: { label_ar: 'غير محسوم', group: 'unknown', description_ar: 'لم أجد نصاً رسمياً ولا إجماعاً بحثياً يحسمه؛ يُترك دون ترجيح.' }
};

export const CANON_CONFIDENCE = {
  high: 'قرار رسمي أو إجماع بحثي موثق',
  medium: 'مصادر ثانوية متسقة دون نص رسمي حاسم',
  low: 'اجتهاد أو مصادر متضاربة'
};

const REF = {
  canon: { label: 'Biblical canon — Wikipedia', url: 'https://en.wikipedia.org/wiki/Biblical_canon' },
  deutero: { label: 'Deuterocanonical books — Wikipedia', url: 'https://en.wikipedia.org/wiki/Deuterocanonical_books' }
};

export const CANON_TRADITIONS = [
  // ───── اليهود ─────
  {
    slug: 'rabbinic', group: 'jewish', name_ar: 'اليهودية الحاخامية', short_ar: 'الحاخامية',
    includes_ar: 'الأرثوذكسية والمحافظة والإصلاحية',
    canon_size_ar: 'التناخ: ٢٤ سفراً بالعدّ اليهودي (يقابلها ٣٩ بالعدّ المسيحي)',
    summary_ar: 'تعتمد التناخ العبري (التوراة والأنبياء والكتب) بالنص الماسوري، ولا تعتمد الأسفار القانونية الثانية ولا العهد الجديد.',
    sources: [REF.canon, { label: 'Dead Sea Scrolls — Wikipedia', url: 'https://en.wikipedia.org/wiki/Dead_Sea_Scrolls' }]
  },
  {
    slug: 'karaite', group: 'jewish', name_ar: 'القرّاؤون', short_ar: 'القرّاؤون',
    includes_ar: 'اليهودية القرّائية',
    canon_size_ar: 'التناخ: ٢٤ سفراً',
    summary_ar: 'يعتمدون التناخ وحده مرجعاً، ويرفضون الشريعة الشفوية الحاخامية؛ فقانونهم المكتوب مطابق في أسفاره لقانون الحاخامية.',
    sources: [{ label: 'Karaite Judaism — Wikipedia', url: 'https://en.wikipedia.org/wiki/Karaite_Judaism' }]
  },
  {
    slug: 'samaritan', group: 'jewish', name_ar: 'السامرة', short_ar: 'السامرة',
    includes_ar: 'الطائفة السامرية',
    canon_size_ar: 'التوراة الخمسة وحدها',
    summary_ar: 'لا يعتمدون إلا أسفار موسى الخمسة بنسختهم السامرية، ولا يعتمدون الأنبياء ولا الكتب.',
    sources: [{ label: 'Samaritan Pentateuch — Wikipedia', url: 'https://en.wikipedia.org/wiki/Samaritan_Pentateuch' }]
  },
  {
    slug: 'beta-israel', group: 'jewish', name_ar: 'يهود بيت إسرائيل', short_ar: 'بيت إسرائيل',
    includes_ar: 'يهود إثيوبيا (الفلاشا)',
    canon_size_ar: 'الأوريت (ثمانية أسفار) وغيرها؛ القانون عندهم غير مغلق',
    summary_ar: 'كتابهم الأقدس «الأوريت» وهو الأسفار الثمانية الأولى (التوراة ويشوع والقضاة وراعوث)، ويقرؤون كتباً جعزية أخرى منها اليوبيلات وأخنوخ؛ وتذكر الدراسات أنه لا حدّ فاصل عندهم بين القانوني وغير القانوني.',
    sources: [
      { label: 'Beta Israel — Wikipedia', url: 'https://en.wikipedia.org/wiki/Beta_Israel' },
      { label: 'National Library of Israel digitization — Times of Israel', url: 'https://www.timesofisrael.com/national-library-announces-digitization-project-of-beta-israel-sacred-manuscripts/' }
    ]
  },
  {
    slug: 'qumran', group: 'jewish', name_ar: 'قمران (تاريخي)', short_ar: 'قمران',
    includes_ar: 'مجموعة مخطوطات البحر الميت',
    canon_size_ar: 'لا قانون مغلق معروف',
    summary_ar: 'مكتبة يهودية من القرون الأخيرة قبل الميلاد. يشهد حضور السفر بين مخطوطاتها لتداوله في ذلك الزمن، ولا يدل وحده على اعتماده.',
    sources: [{ label: 'Dead Sea Scrolls — Wikipedia', url: 'https://en.wikipedia.org/wiki/Dead_Sea_Scrolls' }]
  },
  // ───── النصارى ─────
  {
    slug: 'catholic', group: 'christian', name_ar: 'الكنيسة الكاثوليكية', short_ar: 'الكاثوليكية',
    includes_ar: 'اللاتينية والكنائس الشرقية الكاثوليكية',
    canon_size_ar: '٧٣ سفراً (٤٦ للعهد القديم و٢٧ للجديد)',
    summary_ar: 'قانونها مقرّ في مجمع ترنت ١٥٤٦ بعد قرارات سابقة (هيبو ٣٩٣ وفلورنسا ١٤٤٢)، ويشمل الأسفار القانونية الثانية. يوجد ملحق للفولغاتا فيه ما لم يُقرّ قانونياً.',
    sources: [REF.deutero, REF.canon]
  },
  {
    slug: 'eastern-orthodox', group: 'christian', name_ar: 'الكنائس الأرثوذكسية الخلقيدونية', short_ar: 'الأرثوذكسية الشرقية',
    includes_ar: 'اليونانية والروسية والسلافية والأنطاكية والجورجية',
    canon_size_ar: 'العهد القديم نحو ٤٩ سفراً بحسب بعض العدّ، والعهد الجديد ٢٧',
    summary_ar: 'تعتمد العهد القديم السبعيني بأسفاره القانونية الثانية، وتزيد عن الكاثوليكية بإسدراس الأول (عزرا الثالث) والمكابيين الثالث ومزمور ١٥١ وصلاة منسى؛ وتختلف الكنائس الأرثوذكسية في تفاصيل القوائم.',
    sources: [
      { label: 'Deuterocanon — OrthodoxWiki', url: 'https://orthodoxwiki.org/Deuterocanon' },
      { label: 'The Old Testament Canon and Apocrypha — Bible Researcher', url: 'https://bible-researcher.com/canon2.html' }
    ]
  },
  {
    slug: 'coptic', group: 'christian', name_ar: 'الكنيسة القبطية الأرثوذكسية', short_ar: 'القبطية',
    includes_ar: 'الأرثوذكسية المشرقية (غير الخلقيدونية)',
    canon_size_ar: 'العهد القديم بأسفاره القانونية الثانية، والعهد الجديد ٢٧',
    summary_ar: 'تعدّ موقع الكنيسة القبطية الأسفار القانونية الثانية أصيلة، وتذكر منها طوبيا ويهوديت وتتمة أستير والحكمة وسيراخ وباروخ وتتمة دانيال والمكابيين الأول والثاني ومزمور ١٥١.',
    sources: [{ label: 'الأسفار القانونية الثانية — موقع الكنيسة القبطية (LA Copts)', url: 'https://www.lacopts.org/orthodoxy/our-faith/the-holy-bible/the-deuterocanonical-books/' }]
  },
  {
    slug: 'ethiopian', group: 'christian', name_ar: 'الكنيسة الإثيوبية الأرثوذكسية تواحدو', short_ar: 'الإثيوبية',
    includes_ar: 'الإثيوبية والإريترية',
    canon_size_ar: '٨١ سفراً في القانون الأوسع، يضاف إليها نحو تسعة بحسب بعض الطبعات',
    summary_ar: 'لها قانون أوسع من سائر الكنائس، يضم أخنوخ واليوبيلات والمكابيين الإثيوبيين الثلاثة وعزرا سوتوئيل وبقية كلمات إرميا (باروخ الرابع)، وفي العهد الجديد السينودس وكتابي العهد وإكليمندس والدسقولية. وتتفاوت المصادر في عدّها بين ٨١ و٨٨ بحسب طريقة التقسيم.',
    sources: [
      { label: 'Orthodox Tewahedo biblical canon — Wikipedia', url: 'https://en.wikipedia.org/wiki/Orthodox_Tewahedo_biblical_canon' },
      { label: 'Ethiopian canon — BibleGateway', url: 'https://www.biblegateway.com/learn/?p=8571' }
    ]
  },
  {
    slug: 'armenian', group: 'christian', name_ar: 'الكنيسة الأرمنية الرسولية', short_ar: 'الأرمنية',
    includes_ar: 'الأرثوذكسية المشرقية',
    canon_size_ar: 'قانونها تاريخياً غير مستقر؛ العهد الجديد ٢٧ مع أخذ «٣ كورنثوس» في بعض المخطوطات',
    summary_ar: 'تذكر الدراسات أن قوائم الأرمن القانونية كثيراً ما تحاكي القوائم اليونانية، وأن الاستعمال الفعلي في المخطوطات أصدق شاهداً: ففيها طوال قرون يوسف وأسنات ووصايا الآباء الاثني عشر ضمن العهد القديم.',
    sources: [
      { label: 'The Armenian canon lists — Harvard Theological Review', url: 'https://www.cambridge.org/core/journals/harvard-theological-review/article/armenian-canon-lists-iiithe-lists-of-mechitar-of-ayrivank-c-1285-ce/77C3632514DB0AFFEA810AD6B82F24B8' }
    ]
  },
  {
    slug: 'syriac', group: 'christian', name_ar: 'الكنائس السريانية', short_ar: 'السريانية',
    includes_ar: 'السريانية الأرثوذكسية وكنيسة المشرق الآشورية (قانون البشيطا)',
    canon_size_ar: 'العهد الجديد التقليدي في البشيطا ٢٢ سفراً',
    summary_ar: 'البشيطا التقليدية للعهد الجديد ٢٢ سفراً، تنقصها رسالتا يوحنا الثانية والثالثة وبطرس الثانية ويهوذا والرؤيا، وهذه تُرجمت إلى السريانية لاحقاً. وفي عهدها القديم أسفار قانونية ثانية، وتختلف الكنائس السريانية في التفاصيل.',
    sources: [{ label: 'Peshitta — Wikipedia', url: 'https://en.wikipedia.org/wiki/Peshitta' }]
  },
  {
    slug: 'protestant', group: 'christian', name_ar: 'الكنائس البروتستانتية', short_ar: 'البروتستانتية',
    includes_ar: 'اللوثرية والإصلاحية والمعمدانية والإنجيلية',
    canon_size_ar: '٦٦ سفراً (٣٩ للعهد القديم و٢٧ للجديد)',
    summary_ar: 'قانونها الأسفار الستة والستون. والأسفار القانونية الثانية عندها أبوكريفا غير موحى بها بحسب إقرار ويستمنستر ١٦٤٦، وقد طبعت بعض الطبعات القديمة منها ملحقاً.',
    sources: [{ label: 'Westminster Confession of Faith — Wikipedia', url: 'https://en.wikipedia.org/wiki/Westminster_Confession_of_Faith' }, REF.canon]
  },
  {
    slug: 'anglican', group: 'christian', name_ar: 'الكنيسة الأنجليكانية', short_ar: 'الأنجليكانية',
    includes_ar: 'الكنائس الأنجليكانية',
    canon_size_ar: '٦٦ سفراً قانونياً، مع أبوكريفا تُقرأ للعبرة',
    summary_ar: 'تنص المادة السادسة من «المواد التسع والثلاثين» على قراءة الأسفار الأبوكريفية «لمثال الحياة وتعليم الأخلاق» دون أن تُبنى عليها عقيدة.',
    sources: [{ label: 'Thirty-nine Articles — Wikipedia', url: 'https://en.wikipedia.org/wiki/Thirty-nine_Articles' }]
  }
];

// ───── مجموعات الأسفار ─────
const OT39 = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'];
const NT27 = ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'];
const PENT = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];
const DEUT_CORE = ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA'];
const ADDITIONS = ['ESG', 'DAG'];
const SYRIAC_LATE_FIVE = ['2PE', '2JN', '3JN', 'JUD', 'REV'];
const ETHIOPIC_BROAD = ['ENO', 'JUB', '1MCE', '2MCE', '3MCE', 'EZRS', 'TAGS', 'SIRE', 'SIN', 'COV1', 'COV2', 'CLE-ETH', 'DID-ETH', '4BAR'];
const SAMARITAN_WITNESS = ['SAM', 'SAM-GEN', 'SAM-EXO', 'SAM-LEV', 'SAM-NUM', 'SAM-DEU'];
const WITNESS_CODES = [...SAMARITAN_WITNESS, 'LXX', 'PESH', 'VUL'];
const QUMRAN_ATTESTED_EXTRA = ['TOB', 'SIR', 'PS2', 'ENO', 'JUB', 'T12', 'ARL', 'AMRAM', 'NOAH', 'BNOAH', 'GENAP', 'GIANTS', 'PSJUBA', 'PSJUBB', 'PSJUBC', 'QJACOB', 'APLEV540', 'APLEV541', 'QAHAT', 'Q539', 'APM1Q29', 'APM4Q375', 'APM4Q376', 'APM4Q408', 'Q243', 'Q244', 'Q245', 'Q246', 'Q521', 'Q242', 'Q385', 'Q385B', 'Q386', 'Q388', 'Q391', 'AJ383', 'AJ384', 'AJ385C', 'AJC385A', 'AJC387', 'AJC387A', 'AJC388A', 'AJC389', 'AJC390'];

const C = (s, c = 'high', n = '') => (n ? { s, c, n } : { s, c });
const NOT = C('not');
const has = (list, code) => list.includes(code);

const DEUT_NOTE_PROT = 'عدّتها إقرارات الإصلاح (ويستمنستر ١٦٤٦) أبوكريفا غير موحى بها.';
const NT_REJECTED = 'يرفضها هذا التقليد لأنه لا يعتمد العهد الجديد.';

// ───── منطق كل تقليد ─────
const RULES = {
  rabbinic(b) {
    if (has(OT39, b.code)) return C('canon', 'high', b.code === 'EST' ? 'ضمن «الكتوبيم»؛ وتُقرأ في عيد بوريم.' : '');
    if (has(NT27, b.code)) return C('not', 'high', NT_REJECTED);
    if (b.code === 'SIR') return C('not', 'high', 'تقتبس منه كتب حاخامية قديمة لكنه لم يُدرج في القانون.');
    if (has(DEUT_CORE, b.code) || has(ADDITIONS, b.code)) return C('not', 'high', 'كُتب أو حُفظت باليونانية في الغالب ولم تدخل القانون العبري.');
    return NOT;
  },
  karaite(b) {
    if (has(OT39, b.code)) return C('canon');
    if (has(NT27, b.code)) return C('not', 'high', NT_REJECTED);
    return NOT;
  },
  samaritan(b) {
    if (has(PENT, b.code)) return C('canon');
    if (b.code === 'JOS') return C('not', 'high', 'لهم «سفر يشوع» السامري التاريخي، وهو غير سفر يشوع العبري ولا يُعدّ من القانون.');
    if (has(OT39, b.code)) return C('not', 'high', 'لا يعتمدون الأنبياء ولا الكتب.');
    if (has(NT27, b.code)) return C('not', 'high', NT_REJECTED);
    return NOT;
  },
  'beta-israel'(b) {
    if (['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT'].includes(b.code)) return C('canon', 'high', 'ضمن «الأوريت».');
    if (has(OT39, b.code)) return C('canon', 'medium', 'في مخطوطاتهم الجعزية؛ وليست من «الأوريت» بالمعنى الضيق.');
    if (has(NT27, b.code)) return C('not', 'high', NT_REJECTED);
    const disputed = ['TOB', 'JDT', 'SIR', 'BAR', '1ES', 'EZRS', '1MCE', '2MCE', '3MCE', 'ENO', 'JUB', '4BAR', 'AABR', 'TAISAAC', 'TAJACOB'];
    if (has(disputed, b.code)) return C('disputed', 'medium', 'تُحفظ في تراثهم الجعزي ولا حدّ فاصل بين القانوني وغيره عندهم.');
    return NOT;
  },
  qumran(b) {
    if (b.code === 'EST') return C('absent', 'high', 'السفر الوحيد من التناخ الذي لا نسخة له بين المخطوطات.');
    if (b.code === 'NEH') return C('unknown', 'medium', 'يشهد قمران لعزرا (4Q117) ولا شاهد منفصل لنحميا، وهما سفر واحد في القانون العبري.');
    if (has(OT39, b.code)) return C('attested');
    if (b.code === 'BAR') return C('absent', 'medium', 'يوجد شاهد يوناني قصير لرسالة إرميا (7Q2) ولا شاهد لباروخ نفسه.');
    if (has(QUMRAN_ATTESTED_EXTRA, b.code)) {
      const specific = /^(Q|AJ|APM|APLEV|PSJUB)/.test(b.code) || ['ARL', 'AMRAM', 'NOAH', 'BNOAH', 'GENAP', 'GIANTS', 'QJACOB', 'QAHAT'].includes(b.code);
      return C('attested', specific ? 'high' : (b.code === 'T12' ? 'medium' : 'high'), b.code === 'T12' ? 'تُعرف أجزاء آرامية وعبرية من وصايا لاوي ونفتالي، لا النص اليوناني الكامل.' : '');
    }
    return C('absent', has(NT27, b.code) ? 'high' : 'medium');
  },
  catholic(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has(DEUT_CORE, b.code) || has(ADDITIONS, b.code)) return C('canon2', 'high', 'أُقرّ في مجمع ترنت ١٥٤٦ بعد قرارات هيبو وقرطاج وفلورنسا.');
    if (['1ES', '2ES', 'MAN'].includes(b.code)) return C('appendix', 'high', 'يُطبع في ملحق الفولغاتا الكليمنتية ولا يُعدّ من القانون.');
    if (b.code === 'PS2') return C('appendix', 'medium', 'يرد في المزامير اللاتينية خارج العدد الرسمي ولا يُعدّ قانونياً.');
    return NOT;
  },
  'eastern-orthodox'(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has(DEUT_CORE, b.code) || has(ADDITIONS, b.code)) return C('canon2', 'high', 'أُقرّ في مجمع أورشليم ١٦٧٢ (دوسيثيوس) وفي الاستعمال الليتورجي.');
    if (b.code === '1ES') return C('canon2', 'medium', 'في الطبعات السبعينية اليونانية والسلافية؛ ويسمى عندهم «إسدراس الأول».');
    if (b.code === '3MA') return C('canon2', 'medium', 'في الطبعات السبعينية اليونانية والسلافية، وتتفاوت قوائم الكنائس فيه.');
    if (b.code === 'MAN') return C('canon2', 'medium', 'ضمن «الأوديات» في الطبعات السبعينية.');
    if (b.code === 'PS2') return C('canon2', 'medium', 'في المزامير السبعينية، ويُعدّ مزموراً إضافياً خارج المئة والخمسين.');
    if (b.code === '4MA') return C('appendix', 'medium', 'يرد في ملحق الطبعات اليونانية ولا يُعدّ قانونياً.');
    if (b.code === '2ES') return C('not', 'medium', 'عزرا الثاني عندهم هو عزرا ونحميا لا هذه الرؤيا.');
    return NOT;
  },
  coptic(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has(DEUT_CORE.filter((c) => c !== '3MA'), b.code) || has(ADDITIONS, b.code)) return C('canon2', 'high', 'ضمن ما تذكره الكنيسة القبطية في موقعها عن أسفارها القانونية الثانية.');
    if (b.code === 'PS2') return C('canon2', 'high', 'مذكور في قائمة الكنيسة القبطية المنشورة.');
    if (['1ES', 'MAN', '3MA', '4MA', '2ES'].includes(b.code)) return C('unknown', 'low', 'لا يرد في قائمة الكنيسة القبطية المنشورة، ولم أجد نصاً رسمياً يحسم مكانه.');
    return NOT;
  },
  ethiopian(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has(['TOB', 'JDT', 'WIS', 'SIR', 'BAR', 'ESG', 'DAG'], b.code)) return C('canon2', 'high', 'ضمن القانون الإثيوبي الأوسع.');
    if (['ENO', 'JUB'].includes(b.code)) return C('canon', 'high', 'ضمن القانون الإثيوبي الأوسع للعهد القديم.');
    if (['1MCE', '2MCE', '3MCE'].includes(b.code)) return C('canon', 'high', 'المكابيون الإثيوبيون عمل مستقل عن المكابيين اليونانيين.');
    if (b.code === '4BAR') return C('canon', 'high', 'يسمى «بقية كلمات إرميا» ويُعدّ ضمن القانون الأوسع.');
    if (b.code === 'EZRS') return C('canon', 'high', 'مقابل الإثيوبي لـ٤ عزرا.');
    if (b.code === 'TAGS') return C('canon', 'medium', 'تقسيم تقليدي لأمثال ٢٥–٣١، وليس سفراً مستقلاً في الأصل.');
    if (b.code === 'SIRE') return C('canon2', 'high', 'النص الإثيوبي لسيراخ.');
    if (['SIN', 'COV1', 'COV2', 'CLE-ETH', 'DID-ETH'].includes(b.code)) return C('canon', 'medium', 'من كتب العهد الجديد في القانون الأوسع، وتتفاوت الطبعات في عدّها وتقسيمها.');
    if (b.code === 'JOSB') return C('disputed', 'medium', 'يوسيبون يعدّه بعض المصادر ضمن القانون الأوسع ولا يعدّه غيرها.');
    if (['1ES', '2ES'].includes(b.code)) return C('canon2', 'medium', 'يقابله في القانون الأوسع «عزرا قالي»/«عزرا سوتوئيل»، وتتفاوت المصادر في مطابقته.');
    if (b.code === 'PS2') return C('canon2', 'medium', 'يرد في المزمور الإثيوبي.');
    if (['1MA', '2MA', '3MA', '4MA'].includes(b.code)) return C('not', 'medium', 'تعدّ الكنيسة الإثيوبية المكابيين الإثيوبيين، لا المكابيين اليونانيين.');
    if (b.code === 'MAN') return C('unknown', 'low', 'لم أجد نصاً يحدد مكانه في القانون الإثيوبي.');
    return NOT;
  },
  armenian(b) {
    if (has(OT39, b.code)) return C('canon');
    if (b.code === 'REV') return C('canon', 'medium', 'تأخر قبولها في التقليد الأرمني، وتُعدّ اليوم في القانون.');
    if (has(NT27, b.code)) return C('canon');
    if (has(DEUT_CORE, b.code) || has(ADDITIONS, b.code)) return C('canon2', 'medium', 'تذكرها قوائم الأرمن وطبعاتهم.');
    if (['1ES', '3MA', 'MAN', 'PS2'].includes(b.code)) return C('canon2', 'medium', 'يرد في قوائم الأرمن والمخطوطات بحسب دراسات مايكل ستون.');
    if (b.code === '2ES') return C('canon2', 'low', 'يُذكر في جداول المقارنة بالأصحاحات ٣–١٤ فقط.');
    if (['T12', 'JOSEPH'].includes(b.code)) return C('disputed', 'medium', 'كان في مخطوطات العهد القديم الأرمني قروناً، وليس في القوائم الحديثة.');
    if (b.code === '4MA') return C('not', 'low', 'لم أجد ما يثبت إدراجه.');
    return NOT;
  },
  syriac(b) {
    if (has(OT39, b.code)) return C('canon');
    if (has(SYRIAC_LATE_FIVE, b.code)) return C('disputed', 'high', 'ليست في البشيطا التقليدية ذات الـ٢٢ سفراً؛ ترجمت لاحقاً ودخلت قانون بعض الكنائس السريانية.');
    if (has(NT27, b.code)) return C('canon', 'high');
    if (['WIS', 'SIR', 'BAR', 'ESG', 'DAG'].includes(b.code)) return C('canon2', 'medium', 'في العهد القديم السرياني، وتختلف الطبعات.');
    if (['TOB', 'JDT', '1MA', '2MA'].includes(b.code)) return C('canon2', 'low', 'تذكر المصادر أن معظم القانونية الثانية ترد في السريانية ولا تحدد هذه بدقة.');
    if (b.code === 'PS2') return C('canon2', 'medium', 'مزامير ١٥١–١٥٥ ترد في المخطوطات السريانية.');
    if (b.code === '2BAR') return C('disputed', 'low', 'يرد في مخطوطات سريانية للكتاب المقدس ولا نص رسمي بقانونيته.');
    if (['1ES', '2ES', 'MAN', '3MA', '4MA'].includes(b.code)) return C('unknown', 'low', 'لم أجد نصاً رسمياً يحسمه.');
    return NOT;
  },
  protestant(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has(DEUT_CORE, b.code) || has(ADDITIONS, b.code) || ['1ES', '2ES', 'MAN', 'PS2', '3MA', '4MA'].includes(b.code)) return C('not', 'high', DEUT_NOTE_PROT);
    return NOT;
  },
  anglican(b) {
    if (has(OT39, b.code) || has(NT27, b.code)) return C('canon');
    if (has([...DEUT_CORE, ...ADDITIONS, '1ES', '2ES', 'MAN'], b.code)) return C('read', 'high', 'مذكور في المادة السادسة بين الأسفار التي تُقرأ للعبرة دون بناء عقيدة عليها.');
    if (['PS2', '3MA', '4MA'].includes(b.code)) return C('not', 'medium', 'ليس في قائمة المادة السادسة.');
    return NOT;
  }
};

const isWitness = (b) => b.collection_slug === 'textual-traditions' || WITNESS_CODES.includes(b.code);
const isJewishSource = (b) => b.collection_slug === 'jewish-sources';

// الشاهد النصي نسخة أو ترجمة لا سفر؛ وتُعدّ قانونية فقط عند التقليد الذي يعتمدها نصاً رسمياً.
const OFFICIAL_WITNESS = {
  samaritan: { prefix: 'SAM', note: 'نسخة السامرة الخاصة من التوراة.' },
  'eastern-orthodox': { prefix: 'LXX', note: 'النص الرسمي للعهد القديم في الكنائس اليونانية.' },
  catholic: { prefix: 'VUL', note: 'النص اللاتيني المعتمد تقليدياً في الكنيسة اللاتينية.' },
  syriac: { prefix: 'PESH', note: 'الترجمة السريانية المعتمدة.' }
};
function witnessCell(traditionSlug, book) {
  const official = OFFICIAL_WITNESS[traditionSlug];
  if (official && book.code.split('-')[0] === official.prefix) return C('canon', 'high', official.note);
  return C('witness');
}

// المصادر اليهودية (المشنا والتلمودان والمدراش والقبالة) ليست قانوناً مكتوباً بل مرجعية شفوية أو تراث.
function jewishSourceCell(traditionSlug, book) {
  const kind = book.code.split('-')[0];
  const oralLaw = ['MSH', 'TB', 'TY'].includes(kind);
  const midrash = ['MDA', 'MDH'].includes(kind);
  if (traditionSlug === 'rabbinic') {
    if (oralLaw) return C('oral', 'high', 'الشريعة الشفوية المدوّنة، ومصدر الفقه الحاخامي؛ وتتفاوت التيارات اليهودية في مدى إلزامها.');
    if (midrash) return C('tradition', 'high', 'أدب مدراشي موقَّر وغير ملزم بمرتبة القانون.');
    return C('disputed', 'medium', 'القبالة والزوهر موقّران عند الحسيدية وكثير من الأرثوذكس، وتنكرهما أو تحدّ منهما تيارات أخرى.');
  }
  if (traditionSlug === 'karaite') return C('not', oralLaw ? 'high' : 'medium', oralLaw ? 'يرفضون إلزام الشريعة الشفوية ويقتصرون على التناخ.' : '');
  if (traditionSlug === 'qumran') return C('absent', 'high', 'مؤلَّف بعد زمن مخطوطات قمران.');
  if (traditionSlug === 'beta-israel') return C('not', 'medium', 'لم يعتمد يهود إثيوبيا التلمود تقليدياً.');
  return NOT;
}

export function buildCanonCell(traditionSlug, book) {
  const rule = RULES[traditionSlug];
  if (!rule) throw new Error(`تقليد غير معروف: ${traditionSlug}`);
  const cell = isWitness(book) ? witnessCell(traditionSlug, book) : isJewishSource(book) ? jewishSourceCell(traditionSlug, book) : rule(book);
  if (!CANON_STATUSES[cell.s]) throw new Error(`حالة غير معروفة ${cell.s} للسفر ${book.code} في ${traditionSlug}`);
  return cell;
}

// يبني الجدول لقائمة الأسفار المنشورة (كل سفر: code, name_ar, name_en, collection_slug, collection_name_ar, canonical_order).
export function buildCanonMatrix(books) {
  const rows = books.map((book) => {
    const cells = {};
    for (const tradition of CANON_TRADITIONS) cells[tradition.slug] = buildCanonCell(tradition.slug, book);
    return {
      code: book.code,
      name_ar: book.name_ar,
      name_en: book.name_en,
      collection_slug: book.collection_slug,
      collection_name_ar: book.collection_name_ar,
      canonical_order: book.canonical_order,
      cells
    };
  });
  return { traditions: CANON_TRADITIONS, statuses: CANON_STATUSES, confidence: CANON_CONFIDENCE, rows, stats: buildCanonStats(rows) };
}

export function buildCanonStats(rows) {
  const accepted = new Set(['canon', 'canon2']);
  // الشواهد النصية نسخ لا أسفار، والمصادر اليهودية (المشنا والتلمودان...) مرجعية لا قانون: كلاهما خارج عدّ الأسفار.
  const works = rows.filter((row) => row.collection_slug !== 'textual-traditions' && row.collection_slug !== 'jewish-sources');
  const witnesses = rows.filter((row) => row.collection_slug === 'textual-traditions');
  const jewishSources = rows.filter((row) => row.collection_slug === 'jewish-sources');
  const byTradition = {};
  for (const tradition of CANON_TRADITIONS) {
    const counts = {};
    for (const row of works) {
      const status = row.cells[tradition.slug].s;
      counts[status] = (counts[status] || 0) + 1;
    }
    byTradition[tradition.slug] = {
      counts,
      accepted: (counts.canon || 0) + (counts.canon2 || 0),
      low_confidence: works.filter((row) => row.cells[tradition.slug].c === 'low').length
    };
  }
  const byCollection = {};
  for (const row of rows) byCollection[row.collection_slug] = (byCollection[row.collection_slug] || 0) + 1;
  const acceptedBy = (row, group) => CANON_TRADITIONS.filter((t) => t.group === group && accepted.has(row.cells[t.slug].s)).length;
  return {
    total_books: rows.length,
    total_works: works.length,
    total_witnesses: witnesses.length,
    total_jewish_sources: jewishSources.length,
    by_collection: byCollection,
    by_tradition: byTradition,
    works_accepted_by_no_tradition: works.filter((row) => acceptedBy(row, 'jewish') + acceptedBy(row, 'christian') === 0).length,
    works_accepted_by_one_tradition: works.filter((row) => acceptedBy(row, 'jewish') + acceptedBy(row, 'christian') === 1).length,
    works_accepted_by_all_christian: works.filter((row) => acceptedBy(row, 'christian') === CANON_TRADITIONS.filter((t) => t.group === 'christian').length).length,
    works_accepted_by_any_jewish: works.filter((row) => acceptedBy(row, 'jewish') > 0).length,
    works_accepted_by_any_christian: works.filter((row) => acceptedBy(row, 'christian') > 0).length
  };
}
