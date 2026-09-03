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

function withAppBase(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}` || '/';
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
    }
  }

  return { sect, folderId, docId, articleId, videoId, page: 'home' };
}

/**
 * Generates Bible URL
 */
export function buildBibleUrl({ book, chapter, verse } = {}) {
  if (!book) return withAppBase('/bible');
  if (!chapter) return withAppBase(`/bible/${book}`);
  if (!verse) return withAppBase(`/bible/${book}/${chapter}`);
  return withAppBase(`/bible/${book}/${chapter}/${verse}`);
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

export function pushBibleUrl(params) {
  const newUrl = buildBibleUrl(params);
  if (window.location.pathname !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}
