// URL Helper and Short Link Generator for «رفيق المناظر»

// Mapping for sects to URL slugs
export const SECT_SLUGS = {
  'شيعة': 'shia',
  'سلفية': 'sunna',
  'نصارى': 'christian',
  'إلحاد': 'atheism',
  'all': 'all'
};

export const SLUG_TO_SECT = {
  'shia': 'شيعة',
  'sunna': 'سلفية',
  'christian': 'نصارى',
  'atheism': 'إلحاد',
  'all': 'all'
};

const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
const BIBLE_ONLY = import.meta.env.VITE_BIBLE_ONLY === 'true';

// مسار الكتب الممسوحة: /scans/:slug/:page?q=عبارة (الصفحة تبدأ من ١).
const SCAN_ROUTE = 'scans';
// صفحة جدول اعتماد الأسفار: /canon (النسخة المستقلة) أو /bible/canon.
const CANON_ROUTE = 'canon';

function parseScanParts(parts) {
  if (!parts[0]) return null;
  const page = Number.parseInt(parts[1], 10);
  let slug = parts[0];
  try { slug = decodeURIComponent(slug); } catch { /* يبقى كما هو */ }
  return {
    slug,
    page: Number.isInteger(page) && page > 0 ? page : null,
    query: new URLSearchParams(window.location.search).get('q') || ''
  };
}

function withAppBase(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}` || '/';
}

export function readBibleTranslations() {
  const raw = new URLSearchParams(window.location.search).get('translations');
  if (!raw) return [];
  const list = raw.split(',');
  return list.length <= 100 && list.every(slug => /^[a-z0-9-]{1,100}$/.test(slug))
    ? [...new Set(list)] : [];
}

export function buildBibleWalletUrl(token) {
  return withAppBase(`${BIBLE_ONLY ? '' : '/bible'}/wallet/${encodeURIComponent(token)}`);
}

/**
 * Parses current URL path into state
 * Supports:
 * - /:sect (e.g. /shia)
 * - /:sect/c:folderId (e.g. /shia/c123)
 * - /:sect/p:docId (e.g. /shia/p5919)
 * - /:sect/t:articleId (e.g. /shia/t101)
 * - /:sect/v:videoId (e.g. /shia/v202)
 * - /c:folderId
 * - /p:docId
 */
/**
 * Parses current URL path into state
 * Supports:
 * - /:sect (e.g. /shia)
 * - /:sect/c:folderId (e.g. /shia/c123)
 * - /:sect/p:docId (e.g. /shia/p5919)
 * - /bible (Bible landing)
 * - /bible/:book/:chapter (e.g. /bible/MAT/5)
 * - /bible/:book/:chapter/:verse (e.g. /bible/MAT/5/3)
 * - /bible/search?q=...
 */
export function parseCurrentRoute() {
  let pathname = window.location.pathname;
  if (APP_BASE && (pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`))) {
    pathname = pathname.slice(APP_BASE.length);
  }
  const fullPath = pathname.replace(/^\/+|\/+$/g, '');

  const walletParts = fullPath.split('/');
  const walletPrefix = BIBLE_ONLY ? 0 : 1;
  if ((BIBLE_ONLY || walletParts[0] === 'bible') && walletParts[walletPrefix] === 'wallet') {
    return { page: 'bible', bibleWallet: walletParts[walletPrefix + 1] || 'invalid', sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
  }

  if (BIBLE_ONLY) {
    const bibleParts = fullPath === 'bible' ? [] : fullPath.split('/').filter(Boolean);
    if (bibleParts[0] === 'search') {
      return { page: 'bible', bibleSearch: new URLSearchParams(window.location.search).get('q') || '', sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
    }
    if (bibleParts[0] === CANON_ROUTE) {
      return { page: 'bible', bibleCanon: true, sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
    }
    if (bibleParts[0] === SCAN_ROUTE) {
      return { page: 'bible', bibleScan: parseScanParts(bibleParts.slice(1)), sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
    }
    return {
      page: 'bible',
      bibleBook: bibleParts[0] || null,
      bibleChapter: bibleParts[1] ? parseInt(bibleParts[1]) : null,
      bibleVerse: bibleParts[2] ? parseInt(bibleParts[2]) : null,
      sect: 'all', folderId: null, docId: null, articleId: null, videoId: null
    };
  }

  if (!fullPath) {
    return { sect: 'all', folderId: null, docId: null, articleId: null, videoId: null, page: 'home' };
  }

  const parts = fullPath.split('/');

  if (parts[0] === 'f1') {
    return {
      page: 'guide',
      sect: 'all', folderId: null, docId: null, articleId: null, videoId: null
    };
  }

  // Bible routes
  if (parts[0] === 'bible' && parts[1] === CANON_ROUTE) {
    return { page: 'bible', bibleCanon: true, sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
  }
  if (parts[0] === 'bible' && parts[1] === 'search') {
    return { page: 'bible', bibleSearch: new URLSearchParams(window.location.search).get('q') || '', sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
  }
  if (parts[0] === 'bible' && parts[1] === SCAN_ROUTE) {
    return { page: 'bible', bibleScan: parseScanParts(parts.slice(2)), sect: 'all', folderId: null, docId: null, articleId: null, videoId: null };
  }
  if (parts[0] === 'bible') {
    return {
      page: 'bible',
      bibleBook: parts[1] || null,
      bibleChapter: parts[2] ? parseInt(parts[2]) : null,
      bibleVerse: parts[3] ? parseInt(parts[3]) : null,
      sect: 'all', folderId: null, docId: null, articleId: null, videoId: null
    };
  }

  let sect = 'all';
  let folderId = null;
  let docId = null;
  let articleId = null;
  let videoId = null;

  for (const part of parts) {
    if (SLUG_TO_SECT[part.toLowerCase()]) {
      sect = SLUG_TO_SECT[part.toLowerCase()];
    } else if (/^c\d+$/i.test(part)) {
      folderId = parseInt(part.substring(1), 10);
    } else if (/^p\d+$/i.test(part)) {
      docId = parseInt(part.substring(1), 10);
    } else if (/^t\d+$/i.test(part)) {
      docId = parseInt(part.substring(1), 10);
      articleId = docId;
    } else if (/^v\d+$/i.test(part)) {
      videoId = parseInt(part.substring(1), 10);
    } else if (part === parts[0]) {
      try {sect = decodeURIComponent(part);} catch {sect = part;}
    }
  }

  return { sect, folderId, docId, articleId, videoId, page: 'home' };
}

/**
 * Generates Bible URL
 */
export function buildBibleUrl({ book, chapter, verse, translations } = {}) {
  const routePrefix = BIBLE_ONLY ? '' : '/bible';
  let path = routePrefix || '/';
  if (book) path = `${routePrefix}/${book}${chapter ? `/${chapter}${verse ? `/${verse}` : ''}` : ''}`;
  const url = withAppBase(path);
  return book && translations?.length ? `${url}?translations=${encodeURIComponent(translations.join(','))}` : url;
}

export function buildBibleSearchUrl(query) {
  const routePrefix = BIBLE_ONLY ? '' : '/bible';
  const url = withAppBase(`${routePrefix}/search`);
  return `${url}?q=${encodeURIComponent(String(query || '').trim())}`;
}

export function pushBibleSearchUrl(query) {
  const newUrl = buildBibleSearchUrl(query);
  if (`${window.location.pathname}${window.location.search}` !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}

export function buildScanUrl({ slug, page, query } = {}) {
  const routePrefix = BIBLE_ONLY ? '' : '/bible';
  const base = `${routePrefix}/${SCAN_ROUTE}/${encodeURIComponent(slug)}${page ? `/${page}` : ''}`;
  const url = withAppBase(base);
  return query ? `${url}?q=${encodeURIComponent(query)}` : url;
}

export function buildCanonUrl() {
  return withAppBase(`${BIBLE_ONLY ? '' : '/bible'}/${CANON_ROUTE}`);
}

export function pushCanonUrl() {
  const newUrl = buildCanonUrl();
  if (window.location.pathname !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}

export function pushScanUrl(params) {
  const newUrl = buildScanUrl(params);
  if (`${window.location.pathname}${window.location.search}` !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Generates an SEO & Sharing friendly URL
 */
export function buildRouteUrl({ sect, folderId, docId, isArticle, articleId, videoId }) {
  const parts = [];

  if (sect && sect !== 'all') {
    const slug = SECT_SLUGS[sect] || encodeURIComponent(sect);
    parts.push(slug);
  }

  if (articleId || (docId && isArticle)) {
    parts.push(`t${articleId || docId}`);
  } else if (docId) {
    parts.push(`p${docId}`);
  } else if (folderId) {
    parts.push(`c${folderId}`);
  } else if (videoId) {
    parts.push(`v${videoId}`);
  }

  return withAppBase(parts.length > 0 ? `/${parts.join('/')}` : '/');
}

/**
 * Updates browser address bar without reloading
 */
export function pushRouteUrl(params) {
  const newUrl = buildRouteUrl(params);
  if (window.location.pathname !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}

// يُبقي الجزء بعد # (مثل #21) حين يبقى المسار نفسه (تغيّر المتغيرات فقط مثل ?translations=)، ويُسقطه عند الانتقال إلى مسار آخر.
// newUrl: مسار ومتغيرات نسبيان يبدآن بـ/؛ loc: ما يقابل window.location (pathname وhash).
export function resolveBibleUrlWithHash(newUrl, loc) {
  const target = new URL(newUrl, 'http://placeholder.invalid');
  const samePath = target.pathname === loc.pathname;
  return samePath && loc.hash ? `${newUrl}${loc.hash}` : newUrl;
}

export function pushBibleUrl(params) {
  // يبقى الجزء بعد # (مثل #21) ما دام المسار نفسه، ويسقط عند الانتقال إلى إصحاح آخر.
  const newUrl = resolveBibleUrlWithHash(buildBibleUrl(params), window.location);
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}
