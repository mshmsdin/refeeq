// البحث في أسماء الأسفار بأسمائها المعتمدة والبديلة، مع توحيد الهمزات والتاء المربوطة والتشكيل والأرقام العربية.

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

export function normalizeBookQuery(text) {
  return String(text || '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC.indexOf(digit)))
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/[^ء-يa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keysOf(book) {
  return [book.name_ar, ...(book.aliases || [])].map(normalizeBookQuery).filter(Boolean);
}

// كل كلمات الاستعلام يجب أن تقع في الاسم نفسه (بأي ترتيب).
function matchKey(key, tokens) {
  return tokens.every((token) => key.includes(token));
}

function rank(key, query, tokens) {
  if (key === query) return 0;
  if (key.startsWith(query)) return 1;
  if (key.split(' ').some((word) => word.startsWith(tokens[0]))) return 2;
  return 3;
}

// يرجع الأسفار المطابقة مرتبةً بالأقرب أولاً؛ وعند المطابقة باسم بديل يضع الاسم في matchedAlias ليُعرض بجانب السفر.
export function filterBooksByQuery(books, query) {
  const normalized = normalizeBookQuery(query);
  if (!normalized) return books.map((book) => ({ book, matchedAlias: null, rank: 0 }));
  const tokens = normalized.split(' ');
  const results = [];
  for (const book of books) {
    const code = String(book.code || '').toLowerCase();
    if ((book.book_number && String(book.book_number) === normalized) || code === normalized) {
      results.push({ book, matchedAlias: null, rank: -1 });
      continue;
    }
    const nameKey = normalizeBookQuery(book.name_ar);
    if (nameKey && matchKey(nameKey, tokens)) {
      results.push({ book, matchedAlias: null, rank: rank(nameKey, normalized, tokens) });
      continue;
    }
    let best = null;
    for (const alias of book.aliases || []) {
      const key = normalizeBookQuery(alias);
      if (key && matchKey(key, tokens)) {
        const r = rank(key, normalized, tokens);
        if (!best || r < best.rank) best = { alias, rank: r };
      }
    }
    if (best) results.push({ book, matchedAlias: best.alias, rank: best.rank + 0.5 });
    else if (code.includes(normalized)) results.push({ book, matchedAlias: null, rank: 4 });
  }
  return results.sort((a, b) => a.rank - b.rank);
}

// يضع الترجمة العربية أولاً دون تغيير ترتيب الباقي. translations: قائمة الترجمات (slug وlanguage).
export function arabicFirst(slugs, translations) {
  const isArabic = (slug) => translations.find((t) => t.slug === slug)?.language === 'ar';
  return [...slugs.filter(isArabic), ...slugs.filter((slug) => !isArabic(slug))];
}

// يختار ترجمات سفر عند فتحه: تُبقى المتاحة من اختيار المستخدم، وتُقدَّم العربية إن وُجدت للسفر عربية.
export function pickTranslationsForBook(previous, available, translations) {
  const valid = previous.filter((slug) => available.includes(slug));
  const base = valid.length ? valid : [available[0]];
  const arabicSlug = available.find((slug) => translations.find((t) => t.slug === slug)?.language === 'ar');
  const withArabic = arabicSlug && !base.includes(arabicSlug) && !base.some((slug) => translations.find((t) => t.slug === slug)?.language === 'ar')
    ? [arabicSlug, ...base].slice(0, 2)
    : base;
  return arabicFirst(withArabic, translations);
}
