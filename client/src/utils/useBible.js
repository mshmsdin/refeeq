/**
 * useBible — React hooks for Bible API data and multi-translation comparison
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/bible';

function apiFetch(path) {
  return fetch(API + path).then(r => r.json());
}

export function useTranslations() {
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch('/translations')
      .then(d => {
        if (d.success) setTranslations(d.translations);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return { translations, loading };
}

export function useCollections() {
  const [collections, setCollections] = useState([]);
  useEffect(() => {
    apiFetch('/collections').then(d => { if (d.success) setCollections(d.collections); });
  }, []);
  return collections;
}

export function useBooks(collection) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const url = collection ? `/books?collection=${collection}` : '/books';
    apiFetch(url)
      .then(d => { if (d.success) setBooks(d.books); setLoading(false); })
      .catch(() => setLoading(false));
  }, [collection]);
  return { books, loading };
}

export function useChapter(translationsList, book, chapter) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transKey = Array.isArray(translationsList) ? translationsList.join(',') : translationsList;

  useEffect(() => {
    if (!book || !chapter || !translationsList || (Array.isArray(translationsList) && translationsList.length === 0)) return;
    setLoading(true); setError(null);

    const list = Array.isArray(translationsList) ? translationsList : [translationsList];

    let url = '';
    if (list.length === 1) {
      url = `/chapter?translation=${list[0]}&book=${book}&chapter=${chapter}`;
    } else {
      // Comparison of max 2 for chapter
      const comp = list.slice(0, 2).join(',');
      url = `/compare-chapter?book=${book}&chapter=${chapter}&translations=${comp}`;
    }

    apiFetch(url)
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || 'خطأ في جلب بيانات الإصحاح');
        setLoading(false);
      })
      .catch(() => { setError('تعذر الاتصال بالخادم'); setLoading(false); });
  }, [transKey, book, chapter]);

  return { data, loading, error };
}

export function useVerse(translationsList, book, chapter, verse, verseEnd) {
  const [data, setData] = useState(null);
  const [compareResults, setCompareResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transKey = Array.isArray(translationsList) ? translationsList.join(',') : translationsList;

  useEffect(() => {
    if (!book || !chapter || !verse || !translationsList || (Array.isArray(translationsList) && translationsList.length === 0)) return;
    setLoading(true); setError(null);

    const list = Array.isArray(translationsList) ? translationsList : [translationsList];
    const primaryTrans = list[0];

    // Fetch primary verse (for nav and book info)
    const primaryUrl = `/verse?translation=${primaryTrans}&book=${book}&chapter=${chapter}&verse=${verse}${verseEnd ? `&verse_end=${verseEnd}` : ''}`;
    const promises = [apiFetch(primaryUrl)];

    // Fetch all requested translations (unlimited)
    const compareUrl = `/compare?book=${book}&chapter=${chapter}&verse=${verse}&translations=${list.join(',')}`;
    promises.push(apiFetch(compareUrl));

    Promise.all(promises)
      .then(([primaryRes, compRes]) => {
        if (primaryRes.success) {
          setData(primaryRes);
        } else if (compRes?.success && compRes?.results?.length > 0) {
          // If primary translation failed (e.g. searching Deuterocanon in SVD), fallback using compRes
          setData({
            success: true,
            verses: [compRes.results[0]],
            book: { name_ar: book, code: book },
            navigation: null
          });
        } else {
          setError(primaryRes.error || 'هذا النص غير متوفر في الترجمة المحددة.');
        }

        if (compRes && compRes.success) {
          setCompareResults(compRes.results);
        } else {
          setCompareResults([]);
        }
        setLoading(false);
      })
      .catch(() => { setError('تعذر الاتصال بالخادم'); setLoading(false); });
  }, [transKey, book, chapter, verse, verseEnd]);

  return { data, compareResults, loading, error };
}

export function useBibleSearch(query, translations, opts = {}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const transKey = Array.isArray(translations) ? translations.join(',') : (translations || 'all');

  const search = useCallback((q, trans, options = {}) => {
    if (!q || !q.trim()) { setResult(null); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);

    const transValue = Array.isArray(trans) ? trans.join(',') : (trans || 'all');
    const params = new URLSearchParams({ q: q.trim(), translations: transValue, page: options.page || 1 });
    if (options.book) params.set('book', options.book);
    if (options.collection) params.set('collection', options.collection);
    fetch(`${API}/search?${params}`, { signal: abortRef.current.signal })
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false); })
      .catch(e => { if (e.name !== 'AbortError') { setError('خطأ في البحث'); setLoading(false); } });
  }, []);

  useEffect(() => {
    if (query) search(query, translations, opts);
  }, [query, transKey, opts.page]);

  return { result, loading, error, search };
}
