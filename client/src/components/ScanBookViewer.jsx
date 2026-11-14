/**
 * عارض الكتب الممسوحة: صورة الصفحة من أرشيف الإنترنت، والنص وإحداثيات الكلمات من قاعدة بياناتنا.
 * الصورة هي المرجع؛ النص المفرغ آلياً يُستعمل للبحث وتظليل الكلمات على الصفحة فقط.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Search, X, ZoomIn, ZoomOut } from 'lucide-react';

const IMAGE_WIDTH_FIT = 1200;
const IMAGE_WIDTH_ZOOM = 2000;

function imageSrc(scan, leaf, width) {
  return scan.image_url_template
    .replace('{leaf}', String(leaf).padStart(4, '0'))
    .replace('{width}', String(width));
}

function archivePageUrl(scan, leaf) {
  return `${scan.archive_url}/page/n${leaf}/mode/1up`;
}

export default function ScanBookViewer({ slug, page, query, onNavigate, onBack }) {
  const [scan, setScan] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [pageData, setPageData] = useState(null);
  const [imageState, setImageState] = useState('loading'); // loading | ready | error
  const [zoomed, setZoomed] = useState(false);
  const [queryInput, setQueryInput] = useState(query || '');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const rootRef = useRef(null);

  const leaf = scan ? Math.min(Math.max((Number(page) || 1) - 1, 0), scan.page_count - 1) : 0;

  // بيانات الكتاب: العنوان والأسفار ورابط الصور.
  useEffect(() => {
    let cancelled = false;
    setScan(null);
    setLoadError('');
    fetch(`/api/bible/scans/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setScan(d.scan);
        else setLoadError(d.error || 'تعذر فتح الكتاب.');
      })
      .catch(() => { if (!cancelled) setLoadError('تعذر الاتصال بالخادم.'); });
    return () => { cancelled = true; };
  }, [slug]);

  // نص الورقة الحالية وإحداثيات كلماتها (مع المطابقات إن وُجد بحث).
  useEffect(() => {
    if (!scan) return undefined;
    let cancelled = false;
    setPageData(null);
    setImageState('loading');
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    fetch(`/api/bible/scans/${encodeURIComponent(slug)}/pages/${leaf}${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setPageData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [scan, slug, leaf, query]);

  // البحث داخل الكتاب كله.
  const runSearch = useCallback((text) => {
    const q = String(text || '').trim();
    if (!q) { setResults(null); return; }
    setSearching(true);
    fetch(`/api/bible/scans/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.success ? d : { total: 0, results: [] }))
      .catch(() => setResults({ total: 0, results: [] }))
      .finally(() => setSearching(false));
  }, [slug]);

  useEffect(() => {
    setQueryInput(query || '');
    if (query) runSearch(query);
    else setResults(null);
    // يُنفَّذ البحث عند تغيّر الكتاب أو العبارة فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, slug]);

  // تحميل مسبق للصفحة التالية والسابقة ليكون التقليب سريعاً.
  useEffect(() => {
    if (!scan) return;
    [leaf + 1, leaf - 1].forEach((n) => {
      if (n >= 0 && n < scan.page_count) new Image().src = imageSrc(scan, n, zoomed ? IMAGE_WIDTH_ZOOM : IMAGE_WIDTH_FIT);
    });
  }, [scan, leaf, zoomed]);

  const goToLeaf = useCallback((nextLeaf, nextQuery = query) => {
    if (!scan) return;
    const clamped = Math.min(Math.max(nextLeaf, 0), scan.page_count - 1);
    onNavigate(clamped + 1, nextQuery || '');
    rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scan, query, onNavigate]);

  // في الكتاب العربي: السهم الأيسر للصفحة التالية، والأيمن للسابقة.
  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === 'ArrowLeft') goToLeaf(leaf + 1);
      if (event.key === 'ArrowRight') goToLeaf(leaf - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToLeaf, leaf]);

  const hitBoxes = useMemo(() => {
    if (!pageData) return [];
    return pageData.hits.map((index) => pageData.words[index]).filter(Boolean);
  }, [pageData]);

  const resultLeaves = useMemo(() => (results?.results || []).map((item) => item.leaf), [results]);
  const nextResultLeaf = resultLeaves.find((n) => n > leaf);
  const prevResultLeaf = [...resultLeaves].reverse().find((n) => n < leaf);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = queryInput.trim();
    if (!q) { onNavigate(leaf + 1, ''); return; }
    onNavigate(leaf + 1, q);
  };

  if (loadError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-sm font-bold text-red-800">
        {loadError}
        <div className="mt-3"><button type="button" onClick={onBack} className="underline">العودة</button></div>
      </div>
    );
  }
  if (!scan) return <div dir="rtl" className="py-16 text-center text-sm text-[#735535] dark:text-slate-400">جارٍ فتح الكتاب…</div>;

  const btn = 'inline-flex items-center gap-1 rounded-xl border border-[#ddcfb8] bg-white px-3 py-2 text-xs font-black text-[#5c4127] transition-colors hover:bg-[#efe8dc] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#152238] dark:text-slate-200 dark:hover:bg-slate-800';
  const aspect = pageData ? `${pageData.width} / ${pageData.height}` : '3 / 4';

  return (
    <div dir="rtl" ref={rootRef} className="animate-fadeIn font-scheherazade">
      {/* العنوان */}
      <div className="mb-3 flex items-start gap-3 border-b border-[#ddcfb8] pb-3 dark:border-slate-800">
        <button type="button" onClick={onBack} className="rounded-xl border border-[#ddcfb8] bg-white p-2 text-[#735535] transition-colors hover:bg-[#efe8dc] dark:border-slate-700 dark:bg-[#152238]" aria-label="رجوع">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black leading-8 text-[#322010] dark:text-slate-100 sm:text-xl">{scan.title_ar}</h2>
          <p className="text-xs text-[#735535] dark:text-slate-400">
            {scan.editor_ar ? `تحقيق ${scan.editor_ar} · ` : ''}صفحات ممسوحة من أرشيف الإنترنت
            {' '}
            <a href={archivePageUrl(scan, leaf)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2 dark:text-blue-300">
              فتح الصفحة في أرشيف الإنترنت <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs leading-6 text-[#5c4127] dark:text-slate-300">
        الصورة هي المرجع. النص المفرغ آلياً يُستعمل للبحث وتظليل الكلمات فقط، وقد يخطئ في بعض الكلمات فلا تعتمد عليه في النقل.
        {scan.notes ? ` ${scan.notes}` : ''}
      </div>

      {/* شريط الأدوات */}
      <div className="sticky top-[56px] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#ddcfb8] bg-[#fdfbf7]/95 p-2 backdrop-blur dark:border-slate-700 dark:bg-[#111a2e]/95">
        <button type="button" className={btn} onClick={() => goToLeaf(leaf - 1)} disabled={leaf <= 0}>
          <ChevronRight className="h-4 w-4" /> السابقة
        </button>
        <button type="button" className={btn} onClick={() => goToLeaf(leaf + 1)} disabled={leaf >= scan.page_count - 1}>
          التالية <ChevronLeft className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-1 text-xs font-bold text-[#5c4127] dark:text-slate-300">
          صفحة
          <input
            type="number"
            min={1}
            max={scan.page_count}
            value={leaf + 1}
            onChange={(e) => { const n = Number.parseInt(e.target.value, 10); if (Number.isInteger(n)) goToLeaf(n - 1); }}
            className="w-16 rounded-lg border border-[#ddcfb8] bg-white px-2 py-1 text-center text-xs dark:border-slate-700 dark:bg-[#152238]"
            aria-label="رقم الصفحة"
          />
          من {scan.page_count}
        </label>
        {scan.sections.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) goToLeaf(Number(e.target.value)); }}
            className="rounded-lg border border-[#ddcfb8] bg-white px-2 py-2 text-xs font-bold text-[#5c4127] dark:border-slate-700 dark:bg-[#152238] dark:text-slate-200"
            aria-label="الانتقال إلى سفر"
          >
            <option value="">انتقل إلى سفر…</option>
            {scan.sections.map((section) => (
              <option key={section.code} value={section.firstLeaf}>{section.nameAr}</option>
            ))}
          </select>
        )}
        <button type="button" className={btn} onClick={() => setZoomed((z) => !z)} aria-pressed={zoomed}>
          {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          {zoomed ? 'تصغير' : 'تكبير'}
        </button>

        <form onSubmit={submitSearch} className="flex min-w-[220px] flex-1 items-center gap-1" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aa8e67]" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="ابحث داخل الكتاب…"
              className="w-full rounded-xl border border-[#ddcfb8] bg-white py-2 pl-3 pr-8 text-sm dark:border-slate-700 dark:bg-[#152238]"
              aria-label="البحث داخل الكتاب"
            />
          </div>
          <button type="submit" className={btn}>بحث</button>
          {query && (
            <button type="button" className={btn} onClick={() => { setQueryInput(''); onNavigate(leaf + 1, ''); }} aria-label="مسح البحث">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* نتائج البحث */}
      {query && (
        <div className="mb-3 rounded-2xl border border-[#ddcfb8] bg-white p-3 text-sm dark:border-slate-700 dark:bg-[#152238]">
          {searching && <span className="text-xs text-[#735535]">جارٍ البحث…</span>}
          {!searching && results && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#5c4127] dark:text-slate-200">
                <span>{results.total ? `وُجدت «${query}» في ${results.total} صفحة` : `لا توجد مطابقة لـ «${query}»`}</span>
                {results.total > 0 && (
                  <>
                    <button type="button" className={btn} disabled={prevResultLeaf === undefined} onClick={() => goToLeaf(prevResultLeaf)}>
                      <ArrowRight className="h-3.5 w-3.5" /> المطابقة السابقة
                    </button>
                    <button type="button" className={btn} disabled={nextResultLeaf === undefined} onClick={() => goToLeaf(nextResultLeaf)}>
                      المطابقة التالية <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              {results.total > 0 && (
                <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {results.results.map((item) => (
                    <li key={item.leaf}>
                      <button
                        type="button"
                        onClick={() => goToLeaf(item.leaf)}
                        className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-right text-xs transition-colors hover:bg-[#efe8dc] dark:hover:bg-slate-800 ${item.leaf === leaf ? 'bg-[#efe8dc] font-black dark:bg-slate-800' : ''}`}
                      >
                        <span className="shrink-0 font-mono font-black text-[#b58a43]">ص {item.leaf + 1}</span>
                        <span className="truncate text-[#5c4127] dark:text-slate-300">{item.snippet}</span>
                        {item.count > 1 && <span className="shrink-0 text-[#8d6e47]">×{item.count}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {results.total > results.results.length && (
                <p className="mt-1 text-[11px] text-[#735535] dark:text-slate-400">عُرضت أول {results.results.length} نتيجة؛ دقّق العبارة لتضييق البحث.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* الصفحة مع طبقة التظليل */}
      <div className="mx-auto overflow-x-auto" style={{ maxWidth: zoomed ? '100%' : '820px' }}>
        <div
          className="relative mx-auto overflow-hidden rounded-lg border border-[#ddcfb8] bg-white shadow-md dark:border-slate-700"
          style={{ aspectRatio: aspect, minWidth: zoomed ? '1100px' : undefined }}
        >
          {imageState === 'loading' && <div className="absolute inset-0 grid place-items-center text-xs text-[#735535]">جارٍ تحميل الصفحة…</div>}
          <img
            key={leaf}
            src={imageSrc(scan, leaf, zoomed ? IMAGE_WIDTH_ZOOM : IMAGE_WIDTH_FIT)}
            alt={`صفحة ${leaf + 1} من ${scan.title_ar}`}
            className="absolute inset-0 h-full w-full select-none"
            draggable={false}
            onLoad={() => setImageState('ready')}
            onError={() => setImageState('error')}
          />
          {hitBoxes.map(([text, x, y, w, h], i) => (
            <span
              key={`${i}-${x}-${y}`}
              title={text}
              className="pointer-events-none absolute rounded-sm bg-yellow-300/55 ring-1 ring-orange-500/60 mix-blend-multiply"
              style={{ left: `${x / 100}%`, top: `${y / 100}%`, width: `${w / 100}%`, height: `${h / 100}%` }}
            />
          ))}
          {imageState === 'error' && (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm font-bold text-red-800">
              تعذر تحميل صورة الصفحة من أرشيف الإنترنت.
              <a href={archivePageUrl(scan, leaf)} target="_blank" rel="noreferrer" className="mt-2 block underline">افتحها هناك مباشرة</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
