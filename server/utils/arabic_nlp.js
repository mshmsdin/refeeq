// Arabic NLP Utility for Distinctive Keywords Extraction & Stopwords Filtering

// 1. Comprehensive Arabic Stopwords Set (حروف، ضمائر، ظروف، أسماء إشارة وموصولة، أفعال شائعة، توثيق)
const ARABIC_STOPWORDS = new Set([
  // أحرف الجر والعطف والنداء والتوكيد
  'من', 'الى', 'إلى', 'عن', 'على', 'في', 'حتى', 'خلا', 'حاشا', 'عدا', 'مذ', 'منذ',
  'رب', 'اللام', 'كي', 'الواو', 'التاء', 'الكاف', 'الباء', 'لعل', 'متى', 'بلى',
  'و', 'ف', 'ثم', 'أو', 'أم', 'لكن', 'لا', 'بل', 'أن', 'إن', 'إنما', 'أنما',
  'كأن', 'ليت', 'إلا', 'غير', 'سوى', 'ما', 'ماذا', 'لماذا', 'كيف',
  'أين', 'أيان', 'أنى', 'كم', 'أي', 'أيها', 'أيتها', 'يا', 'هيا', 'أيا',

  // الضمائر المنفصلة والمتصلة
  'أنا', 'نحن', 'أنت', 'أنتِ', 'أنتما', 'أنتم', 'أنتن',
  'هو', 'هي', 'هما', 'هم', 'هن', 'إياك', 'إياكم', 'إياه', 'إياها', 'إياهم',
  'لي', 'لنا', 'لك', 'لكم', 'له', 'لها', 'لهم', 'به', 'بها', 'بهم', 'فيه', 'فيها', 'فيهم',
  'عنه', 'عنها', 'عنهم', 'منه', 'منها', 'منهم', 'عليه', 'عليها', 'عليهم', 'إليه', 'إليها', 'إليهم',

  // أسماء الإشارة والأسماء الموصولة
  'هذا', 'هذه', 'هذان', 'هاتان', 'هؤلاء', 'ذلك', 'ذاك', 'تلك', 'ذلكم', 'أولئك',
  'الذي', 'التي', 'اللذان', 'اللتان', 'الذين', 'اللاتي', 'اللواتي',

  // الظروف والأدوات الزمانية والمكانية
  'قبل', 'بعد', 'مع', 'عند', 'بين', 'فوق', 'تحت', 'أمام', 'خلف', 'وراء', 'يمين', 'شمال',
  'حين', 'إذ', 'إذا', 'لما', 'كل', 'جميع', 'بعض', 'مثل', 'نحو', 'شبه',
  'قد', 'سوف', 'لن', 'لم', 'ليس', 'دون', 'فقط', 'كذلك', 'أيضا', 'أيضاً', 'هناك', 'هنا',
  'جدا', 'جداً', 'معا', 'معاً', 'دائما', 'دائماً', 'أبدا', 'أبداً',

  // الأفعال الشائعة جداً في الرواية والنصوص
  'قال', 'قالت', 'قالوا', 'قلت', 'قلنا', 'يقول', 'تقول', 'نقول', 'يقولون', 'قوله', 'قولهم',
  'كان', 'كانت', 'كانوا', 'كنت', 'كنا', 'يكون', 'تكون', 'نكون', 'يكونون',
  'روى', 'رويت', 'رووا', 'يروي', 'يروون', 'رواية', 'رواه',
  'حدثنا', 'حدثني', 'حدثكم', 'حدثهم', 'أخبرنا', 'أخبرني', 'أخبركم', 'أنبأنا', 'سمعت', 'سمعنا',
  'ذكر', 'ذكرت', 'ذكروا', 'يذكر', 'يذكرون', 'ذكره', 'ذكرنا',
  'جاء', 'أتى', 'ذهب', 'رأى', 'وجد', 'أخذ', 'جعل', 'أصبح', 'أمسى', 'ظل', 'بات',
  'وضع', 'كتب', 'زاد', 'نقص', 'بقي', 'قام', 'قعد', 'دخل', 'خرج',

  // كلمات التوثيق والترقيم والامتدادات
  'ص', 'صـ', 'صحة', 'صفحة', 'جزء', 'مجلد', 'طبعة', 'دار', 'مكتبة', 'تحقيق', 'تأليف', 'طبع',
  'باب', 'فصل', 'حديث', 'رقم', 'رقمها', 'نسخة', 'مخطوطة', 'هامش', 'حاشية', 'تعليق', 'انظر', 'راجع',
  'السنة', 'الشهر', 'اليوم', 'أول', 'آخر', 'وسط', 'التالي', 'السابق',
  'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff', 'pdf', 'image', 'photo'
]);

// 2. Normalization function
export function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ـ]/g, '') // Tatweel
    .replace(/[^\u0600-\u06FF\w\s]/g, ' ') // Replace non-alphanumeric with space
    .trim();
}

/**
 * Extracts distinct, high-value keywords from text
 * Filters out stop words, short words, numbers, extensions, and common generic verbs.
 * @param {string} text - Raw OCR text or document text
 * @param {string} filename - Document filename or title for context weighting
 * @param {number} maxKeywords - Maximum number of keywords to return (default 8)
 * @returns {Array<string>} List of distinctive keywords
 */
export function extractDistinctKeywords(text = '', filename = '', maxKeywords = 8) {
  // Clean filename of extension and raw hash IDs
  const cleanFilename = (filename || '')
    .replace(/\.(jpg|jpeg|png|webp|bmp|gif|tiff)$/i, '')
    .replace(/\b\d{6,}\b/g, '') // remove pure long digit strings like Telegram file IDs
    .trim();

  const combinedText = `${cleanFilename} ${text}`;
  if (!combinedText.trim()) return [];

  // Normalize
  const normalized = normalizeArabicText(combinedText);
  const words = normalized.split(/\s+/).filter(Boolean);

  const wordFrequencies = new Map();

  for (const rawWord of words) {
    let word = rawWord.trim().toLowerCase();

    // Skip words with length <= 2 characters
    if (word.length <= 2) continue;

    // Skip pure numbers or long random tokens containing underscores/digits
    if (/^\d+$/.test(word) || /^[a-z0-9_]+$/i.test(word)) continue;

    // Remove common prefixes like 'ال' for stopwords check
    let strippedWord = word;
    if (word.startsWith('ال') && word.length > 3) {
      strippedWord = word.substring(2);
    }

    // Check against stopwords
    if (ARABIC_STOPWORDS.has(word) || ARABIC_STOPWORDS.has(strippedWord)) {
      continue;
    }

    // Must contain Arabic characters
    if (!/[\u0600-\u06FF]/.test(word)) {
      continue;
    }

    // Bonus weight for presence in clean filename and for distinct length
    let weight = 1;
    if (cleanFilename && (cleanFilename.includes(word) || cleanFilename.includes(rawWord))) {
      weight += 2.5;
    }
    if (word.length >= 5) {
      weight += 0.5;
    }

    wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + weight);
  }

  // Sort by weight/frequency descending
  const sortedKeywords = Array.from(wordFrequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return sortedKeywords.slice(0, maxKeywords);
}
