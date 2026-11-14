/**
 * Bible Section — Luxury Digital Manuscript Reader (الموثق الرقمي للكتاب المقدس)
 * Integrates luxury manuscript design (Beige/Gold/Brown palette, Readex Pro & Scheherazade New fonts)
 * with live database, multi-translation comparison, church canon recognition, and modal focus.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, BookOpen, ChevronLeft, ChevronRight, Copy, Check, X,
  ArrowRight, ArrowLeft, List, Columns, Sparkles, Filter, ChevronDown,
  BookMarked, CheckSquare, Square, Info, Award, Scroll, Bookmark,
  CheckCircle2, XCircle, Landmark, FileText
} from 'lucide-react';
import { parseCurrentRoute, pushBibleUrl, pushScanUrl } from '../utils/urlRoutes';
import ScanBookViewer from './ScanBookViewer';
import {
  useTranslations, useCollections, useBooks, useChapter, useVerse, useBibleSearch
} from '../utils/useBible';

const BIBLE_ONLY = import.meta.env.VITE_BIBLE_ONLY === 'true';

function catalogStatusLabel(value) {
  return {
    not_imported: 'قيد الإعداد',
    cataloged: 'مفهرس',
    planned: 'مخطط له',
    pending_review: 'بانتظار المراجعة',
    complete: 'كامل',
    partial: 'مجزأ'
  }[value] || value || 'غير محدد';
}

// ─────────────────────────────────────────────────────────
//  Helpers & Clipboard
// ─────────────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}

function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((p, i) =>
    regex.test(p) ? (
      <mark key={i} className="bg-[#b58a43]/30 text-inherit rounded px-0.5 font-bold">
        {p}
      </mark>
    ) : p
  );
}

function upsertMeta(attribute, name, content) {
  if (!content) return;
  let node = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function updateBibleSeo({ title, description, url, summary, bookTitle, chapter, verse }) {
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);

  const existing = document.getElementById('bible-client-structured-data');
  const script = existing || document.createElement('script');
  script.id = 'bible-client-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    abstract: summary,
    url,
    inLanguage: 'ar',
    isPartOf: { '@type': 'WebSite', name: 'البيبل | Bible', url: `${window.location.origin}${import.meta.env.BASE_URL}` },
    about: bookTitle ? { '@type': 'Book', name: bookTitle } : undefined,
    mainEntity: chapter ? { '@type': 'Chapter', name: `${bookTitle} — الإصحاح ${chapter}${verse ? `:${verse}` : ''}` } : undefined
  });
  if (!existing) document.head.appendChild(script);
}

// ─────────────────────────────────────────────────────────
//  Church Recognition & Canon Info Box
// ─────────────────────────────────────────────────────────
function BookCanonInfoBox({ bookInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canon = bookInfo?.canon_info;
  if (!canon) return null;

  const isDisputed = bookInfo?.is_disputed || canon?.is_disputed;

  return (
    <div className="mb-6 animate-fadeIn font-scheherazade" dir="rtl">
      <div
        className={`rounded-2xl border transition-all ${
          isDisputed
            ? 'bg-[#fdfbf7]/90 dark:bg-[#152238] border-[#b58a43]/40 shadow-sm'
            : 'bg-[#f8f6f2]/80 dark:bg-[#111a2e] border-[#ddcfb8]/60 dark:border-slate-800'
        }`}
      >
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-right cursor-pointer select-none hover:bg-[#b58a43]/5 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <Landmark className={`w-5 h-5 ${isDisputed ? 'text-[#b58a43]' : 'text-blue-500'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-[#322010] dark:text-slate-100">
                  موقف الكنائس من سفر «{bookInfo?.name_ar}»
                </span>
                {isDisputed ? (
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#b58a43]/15 text-[#735535] dark:text-[#d5be98] font-bold border border-[#b58a43]/30">
                    سفر قانوني ثانٍ / مختلف فيه
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                    محل إجماع كنسي
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#735535]/80 dark:text-slate-400 mt-0.5">
                {canon?.category_name} — انقر لعرض قرارات المجامع واعتراف الكنائس
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#8d6e47] dark:text-[#d5be98] font-bold shrink-0">
            <span>{isExpanded ? 'إخفاء' : 'عرض التفاصيل'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-[#ddcfb8]/60 dark:border-slate-800 space-y-3.5 text-xs sm:text-sm">
            {canon.accepted_by && canon.accepted_by.length > 0 && (
              <div className="bg-white/80 dark:bg-[#1a2942] p-3.5 rounded-xl border border-emerald-500/30">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-400 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>الكنائس التي تعترف به ككتاب قانوني موحى به:</span>
                </div>
                <ul className="space-y-1 pr-2">
                  {canon.accepted_by.map((item, i) => (
                    <li key={i} className="text-[#322010] dark:text-slate-200 leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canon.rejected_by && canon.rejected_by.length > 0 && (
              <div className="bg-white/80 dark:bg-[#1a2942] p-3.5 rounded-xl border border-rose-500/30">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-400 mb-1.5">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>الكنائس والتقاليد التي لا تعترف بقانونيته (تعتبره من الأبوكريفا):</span>
                </div>
                <ul className="space-y-1 pr-2">
                  {canon.rejected_by.map((item, i) => (
                    <li key={i} className="text-[#322010] dark:text-slate-200 leading-relaxed flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canon.notes && (
              <div className="bg-white/80 dark:bg-[#1a2942] p-3 rounded-xl border border-[#ddcfb8]/60 dark:border-slate-800 text-[#5c4127] dark:text-slate-300 text-xs leading-relaxed">
                <span className="font-bold text-[#322010] dark:text-slate-100 ml-1">📜 توثيق المخطوطات والترجمات:</span>
                {canon.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Translation Selection Chips (Checkboxes & Direct Switching)
// ─────────────────────────────────────────────────────────
function TranslationSelectorChips({
  translations,
  selectedSlugs,
  availableSlugs = [],
  primarySlug,
  onSwitchPrimary,
  onToggleCheckbox,
  isChapterMode = false
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2" dir="rtl">
      <div className="flex items-center gap-1.5 text-xs text-[#5c4127] dark:text-slate-300 font-bold shrink-0">
        <span>الترجمات:</span>
        {isChapterMode ? (
          <span className="text-[11px] text-[#8d6e47] dark:text-amber-400/90 font-normal">
            (حدد 1 أو 2)
          </span>
        ) : (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-normal">
            (حدد أي عدد)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {translations.filter(t => availableSlugs.includes(t.slug)).map(t => {
          const isSelected = selectedSlugs.includes(t.slug);
          const isPrimary = primarySlug === t.slug;

          return (
            <div
              key={t.slug}
              className={`flex items-center rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-sm ${
                isSelected
                  ? 'bg-white dark:bg-[#1a2942] border-[#8d6e47] text-[#322010] dark:text-[#f8f3ea]'
                  : 'bg-white/70 dark:bg-[#111a2e] border-[#ddcfb8] dark:border-slate-800 text-[#735535] dark:text-slate-400 hover:border-[#b58a43]'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCheckbox(t.slug);
                }}
                className="p-1.5 pr-2.5 hover:text-[#b58a43] transition-colors"
                title="تحديد للمقارنة"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#8d6e47] dark:text-[#c2a578] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#aa8e67] dark:text-slate-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSwitchPrimary(t.slug)}
                className={`py-1 pl-3 pr-1 text-right transition-colors cursor-pointer ${
                  isPrimary ? 'font-black text-[#5c4127] dark:text-[#f0e6d2] underline decoration-[#b58a43] decoration-2' : ''
                }`}
                title={`انقر للقراءة المباشرة بترجمة ${t.name_ar}`}
              >
                <span>{t.name_ar}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Quick Book / Chapter / Verse Jump Box
// ─────────────────────────────────────────────────────────
function QuickNavigator({ books, onNavigate }) {
  const [selectedBookCode, setSelectedBookCode] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chapter, setChapter] = useState('');
  const [verse, setVerse] = useState('');
  const containerRef = useRef(null);

  const navigableBooks = books.filter(b => (b.available_translations || []).length > 0);
  const filteredBooks = navigableBooks.filter(b => {
    if (!bookQuery.trim()) return true;
    const q = bookQuery.trim();
    return (
      b.name_ar.includes(q) ||
      (b.code && b.code.toLowerCase().includes(q.toLowerCase())) ||
      (b.book_number && b.book_number.toString() === q)
    );
  });

  const selectedBook = navigableBooks.find(b => b.code === selectedBookCode);

  const handleSelectBook = (b) => {
    setSelectedBookCode(b.code);
    setBookQuery(`[${b.book_number || b.id}] ${b.name_ar}`);
    setIsDropdownOpen(false);
    setChapter('1');
    setVerse('');
  };

  const handleJump = (e) => {
    e.preventDefault();
    if (!selectedBookCode) {
      if (filteredBooks.length > 0) {
        const b = filteredBooks[0];
        const ch = parseInt(chapter) || 1;
        const v = verse.trim() ? parseInt(verse) : null;
        onNavigate(b.code, ch, v);
      }
      return;
    }
    const ch = parseInt(chapter) || 1;
    const v = verse.trim() ? parseInt(verse) : null;
    onNavigate(selectedBookCode, ch, v);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form onSubmit={handleJump} className="w-full max-w-3xl mx-auto mt-3 font-scheherazade" dir="rtl">
      <div className="luxury-border bg-[#fdfbf7]/90 dark:bg-[#152238] rounded-2xl p-3.5 shadow-luxury">
        <div className="flex items-center gap-2 mb-2">
          <BookMarked className="w-4 h-4 text-[#b58a43]" />
          <span className="text-xs font-bold text-[#5c4127] dark:text-slate-300">الانتقال السريع إلى سفر أو إصحاح أو عدد:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Book Input & Autocomplete */}
          <div className="sm:col-span-6 relative" ref={containerRef}>
            <div className="relative">
              <input
                type="text"
                value={bookQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => {
                  setBookQuery(e.target.value);
                  setSelectedBookCode('');
                  setIsDropdownOpen(true);
                }}
                placeholder="اكتب اسم السفر أو رقمه (مثال: متى، 40، التكوين)..."
                className="w-full pr-3 pl-8 py-2 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white/90 dark:bg-[#111a2e] text-[#322010] dark:text-slate-100 font-scheherazade scheherazade-font text-base sm:text-lg font-bold placeholder:font-scheherazade focus:outline-none focus:border-[#8d6e47]"
                dir="rtl"
              />
              <ChevronDown
                className="w-4 h-4 text-[#aa8e67] absolute left-2.5 top-3.5 cursor-pointer pointer-events-none"
              />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 right-0 left-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#152238] border border-[#ddcfb8] dark:border-slate-700 rounded-xl shadow-xl divide-y divide-[#f8f3ea] dark:divide-slate-800 font-scheherazade">
                {filteredBooks.length === 0 ? (
                  <div className="p-3 text-sm text-center text-[#aa8e67] font-bold">لا يوجد سفر بهذا الاسم</div>
                ) : (
                  filteredBooks.map(b => {
                    const isDeutero = b.collection_slug === 'deuterocanon';
                    const isApocrypha = ['apocrypha', 'pseudepigrapha'].includes(b.collection_slug);
                    return (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => handleSelectBook(b)}
                        className="w-full text-right px-3.5 py-2.5 text-sm sm:text-base hover:bg-[#f8f3ea] dark:hover:bg-[#1a2942] flex items-center justify-between gap-2 transition-colors font-scheherazade cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[#b58a43] dark:text-[#c2a578] font-bold font-mono text-xs bg-[#b58a43]/10 dark:bg-[#b58a43]/20 px-2 py-0.5 rounded-lg shrink-0">
                            [{b.book_number || b.id}]
                          </span>
                          <span className="font-bold text-[#322010] dark:text-slate-100 truncate">
                            {b.name_ar}
                          </span>
                          {isDeutero && (
                            <span className="text-[10px] text-[#735535] dark:text-[#d5be98] bg-[#f0e6d2] dark:bg-slate-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                              قانوني ثانٍ
                            </span>
                          )}
                          {isApocrypha && (
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded font-bold shrink-0">
                              أبوكريفا
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#8d6e47] dark:text-slate-400 font-mono shrink-0">
                          {b.chapter_count || 0} إصحاح
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Chapter input */}
          <div className="sm:col-span-2">
            <input
              type="number"
              min="1"
              max={selectedBook?.chapter_count || 150}
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              placeholder="الإصحاح"
              className="w-full text-center py-2 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white/90 dark:bg-[#111a2e] text-[#322010] dark:text-slate-100 font-scheherazade scheherazade-font text-base sm:text-lg font-bold placeholder:font-scheherazade focus:outline-none focus:border-[#8d6e47]"
            />
          </div>

          {/* Verse input (optional) */}
          <div className="sm:col-span-2">
            <input
              type="number"
              min="1"
              value={verse}
              onChange={e => setVerse(e.target.value)}
              placeholder="العدد (اختياري)"
              className="w-full text-center py-2 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white/90 dark:bg-[#111a2e] text-[#322010] dark:text-slate-100 font-scheherazade scheherazade-font text-base sm:text-lg font-bold placeholder:font-scheherazade focus:outline-none focus:border-[#8d6e47]"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-[#8d6e47] to-[#735535] hover:from-[#735535] hover:to-[#5c4127] active:scale-95 text-[#fdfbf7] font-bold rounded-xl font-scheherazade text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>انتقال</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────
//  Bible Search Box (with Multi-Translation Selection)
// ─────────────────────────────────────────────────────────
const SEARCH_COLLECTION_OPTIONS = [
  { slug: 'old-testament', label: 'العهد القديم' },
  { slug: 'new-testament', label: 'العهد الجديد' },
  { slug: 'deuterocanon', label: 'أبوكريفا العهد القديم' },
  { slug: 'pseudepigrapha', label: 'المنحولات والرؤى القديمة' }
];

function SearchCollectionOptions({ selectedCollections, onToggleCollection }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 px-1 text-sm" aria-label="نطاق الأسفار في البحث">
      <span className="font-bold text-[#735535] dark:text-slate-300 ml-1">نطاق البحث:</span>
      {SEARCH_COLLECTION_OPTIONS.map(option => {
        const checked = selectedCollections.includes(option.slug);
        return (
          <button
            key={option.slug}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggleCollection(option.slug)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d6e47] ${
              checked
                ? 'border-[#8d6e47] bg-[#efe8dc] text-[#322010] shadow-sm dark:border-[#b58a43] dark:bg-slate-800 dark:text-[#f8f3ea]'
                : 'border-[#ddcfb8] bg-white/80 text-[#735535] hover:border-[#b58a43] dark:border-slate-700 dark:bg-[#111a2e] dark:text-slate-400'
            }`}
          >
            {checked ? (
              <CheckSquare className="h-4 w-4 text-[#8d6e47] dark:text-[#c2a578]" />
            ) : (
              <Square className="h-4 w-4 text-[#aa8e67] dark:text-slate-500" />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BibleSearchBox({
  onSubmit,
  initialQuery = '',
  translations = [],
  selectedTranslations = ['all'],
  selectedCollections = ['old-testament', 'new-testament'],
  onToggleTranslation,
  onToggleCollection,
  onSelectAllTranslations,
  onSelectDefaultTranslation
}) {
  const [q, setQ] = useState(initialQuery);
  const isAllSelected = selectedTranslations.includes('all') || (!selectedTranslations.includes('default') && selectedTranslations.length === translations.length);

  const handleSubmit = e => {
    e.preventDefault();
    if (q.trim()) onSubmit(q.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto font-scheherazade" dir="rtl">
      <div className="relative flex items-center">
        <Search className="absolute right-4 w-5 h-5 text-[#8d6e47] dark:text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ابحث بكلمة أو مرجع (مثال: متى 5:3 أو ملكوت السماوات أو يوحنا 3:16)..."
          className="w-full pr-12 pl-24 py-3 rounded-2xl border border-[#ddcfb8] dark:border-slate-700 bg-white/90 dark:bg-[#152238] text-[#322010] dark:text-slate-100 placeholder-[#aa8e67] dark:placeholder-slate-500 font-scheherazade scheherazade-font text-base sm:text-lg font-bold shadow-luxury focus:outline-none focus:border-[#8d6e47]"
          dir="rtl"
        />
        <button
          type="submit"
          className="absolute left-2.5 bg-gradient-to-r from-[#8d6e47] to-[#735535] hover:from-[#735535] hover:to-[#5c4127] active:scale-95 text-[#fdfbf7] font-bold px-4 py-1.5 rounded-xl font-scheherazade text-sm sm:text-base shadow-md transition-all"
        >
          بحث
        </button>
      </div>

      {/* Translation Selection Chips for Search */}
      {translations.length > 0 && (
        <div className="mt-2.5 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-[#735535] dark:text-slate-300 ml-1">الترجمة:</span>

          <button
            type="button"
            onClick={onSelectDefaultTranslation}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedTranslations.includes('default')
                ? 'bg-gradient-to-r from-[#8d6e47] to-[#735535] text-[#fdfbf7] border-[#735535] shadow-sm'
                : 'bg-white/80 dark:bg-[#152238] text-[#5c4127] dark:text-slate-300 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
            }`}
          >
            ترجمة مناسبة لكل سفر
          </button>
          
          <button
            type="button"
            onClick={onSelectAllTranslations}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isAllSelected
                ? 'bg-gradient-to-r from-[#8d6e47] to-[#735535] text-[#fdfbf7] border-[#735535] shadow-sm'
                : 'bg-white/80 dark:bg-[#152238] text-[#5c4127] dark:text-slate-300 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
            }`}
          >
            كافة الترجمات (الكل)
          </button>

          </div>
          <details className="mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center rounded-lg px-2 py-1 font-bold text-[#735535] hover:bg-[#efe8dc] dark:text-slate-300 dark:hover:bg-slate-800">اختيار ترجمة محددة</summary>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {translations.map(t => {
            const isSelected = !isAllSelected && selectedTranslations.includes(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => onToggleTranslation(t.slug)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#efe8dc] dark:bg-slate-800 text-[#322010] dark:text-[#f8f3ea] border-[#8d6e47] shadow-sm'
                    : 'bg-white/70 dark:bg-[#111a2e] text-[#735535] dark:text-slate-400 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#8d6e47] dark:text-[#c2a578] shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#aa8e67] dark:text-slate-500 shrink-0" />
                )}
                <span>{t.name_ar}</span>
              </button>
            );
          })}
            </div>
          </details>
        </div>
      )}
      <SearchCollectionOptions selectedCollections={selectedCollections} onToggleCollection={onToggleCollection} />
    </form>
  );
}


// ─────────────────────────────────────────────────────────
//  Search Results View
// ─────────────────────────────────────────────────────────
function SearchResults({
  query,
  selectedTranslations,
  selectedCollections,
  translations,
  onToggleTranslation,
  onToggleCollection,
  onSelectAllTranslations,
  onSelectDefaultTranslation,
  onOpenVerse,
  onBack
}) {
  const [page, setPage] = useState(1);
  const { result, loading, error } = useBibleSearch(query, selectedTranslations, { page, collections: selectedCollections });
  const LIMIT = 30;

  if (loading && !result) {
    return (
      <div className="text-center py-16 text-[#735535] font-scheherazade" dir="rtl">
        <div className="inline-block w-8 h-8 border-2 border-[#b58a43] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-semibold text-sm">جارٍ البحث في نصوص البيبل...</p>
      </div>
    );
  }

  if (error) return <p className="text-center py-8 text-red-500 font-scheherazade" dir="rtl">{error}</p>;
  if (!result) return null;

  if (result.type === 'reference' && result.reference) {
    const ref = result.reference;
    setTimeout(() => onOpenVerse(ref.bookCode, ref.chapter, ref.verseStart, ref.verseEnd), 0);
    return <div className="text-center py-8 text-[#735535] font-bold font-scheherazade">جارٍ فتح المرجع المحدد...</div>;
  }

  const { results = [], total = 0 } = result;

  return (
    <div dir="rtl" className="animate-fadeIn font-scheherazade">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#735535] hover:text-[#b58a43] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع للرئيسية</span>
        </button>
        <h2 className="text-sm sm:text-base font-extrabold text-[#322010] dark:text-slate-100">
          نتائج البحث عن: <span className="text-[#8d6e47] dark:text-[#c2a578]">"{query}"</span>
          <span className="text-xs font-normal text-[#8d6e47] dark:text-slate-400 mr-2">({total.toLocaleString('ar-EG')} نتيجة)</span>
        </h2>
      </div>

      {/* Translation Filter Chips */}
      {translations.length > 0 && (
        <div className="mb-4 pb-3 border-b border-[#ddcfb8]/60 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-[#735535] dark:text-slate-300 ml-1">الترجمة:</span>

          <button
            type="button"
            onClick={onSelectDefaultTranslation}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedTranslations.includes('default')
                ? 'bg-gradient-to-r from-[#8d6e47] to-[#735535] text-[#fdfbf7] border-[#735535] shadow-sm'
                : 'bg-white/80 dark:bg-[#152238] text-[#5c4127] dark:text-slate-300 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
            }`}
          >
            ترجمة مناسبة لكل سفر
          </button>
          
          <button
            type="button"
            onClick={onSelectAllTranslations}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedTranslations.includes('all') || (!selectedTranslations.includes('default') && selectedTranslations.length === translations.length)
                ? 'bg-gradient-to-r from-[#8d6e47] to-[#735535] text-[#fdfbf7] border-[#735535] shadow-sm'
                : 'bg-white/80 dark:bg-[#152238] text-[#5c4127] dark:text-slate-300 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
            }`}
          >
            كافة الترجمات (الكل)
          </button>

          </div>
          <details className="mt-2">
            <summary className="inline-flex cursor-pointer list-none rounded-lg px-2 py-1 font-bold text-[#735535] hover:bg-[#efe8dc] dark:text-slate-300 dark:hover:bg-slate-800">اختيار ترجمة محددة</summary>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {translations.map(t => {
            const isAll = selectedTranslations.includes('all') || (!selectedTranslations.includes('default') && selectedTranslations.length === translations.length);
            const isSelected = !isAll && selectedTranslations.includes(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => onToggleTranslation(t.slug)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#efe8dc] dark:bg-slate-800 text-[#322010] dark:text-[#f8f3ea] border-[#8d6e47] shadow-sm'
                    : 'bg-white/70 dark:bg-[#111a2e] text-[#735535] dark:text-slate-400 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#8d6e47] dark:text-[#c2a578] shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#aa8e67] dark:text-slate-500 shrink-0" />
                )}
                <span>{t.name_ar}</span>
              </button>
            );
          })}
            </div>
          </details>
        </div>
      )}

      <SearchCollectionOptions selectedCollections={selectedCollections} onToggleCollection={onToggleCollection} />

      {results.length === 0 ? (
        <div className="text-center py-16 text-[#8d6e47]">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-bold">لم يتم العثور على أي آيات تطابق هذا البحث.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => onOpenVerse(r.book_code, r.chapter, r.verse)}
                className="verse-card p-4 sm:p-5 rounded-2xl border border-[#ddcfb8] dark:border-slate-800 bg-white/70 dark:bg-[#152238] hover:border-[#b58a43] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#735535] dark:text-[#d5be98] bg-[#f0e6d2] dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-[#ddcfb8]/60 dark:border-slate-700">
                        {r.book_name} {r.chapter}:{r.verse}
                      </span>
                      <span className="text-[11px] text-[#8d6e47] dark:text-slate-400 font-medium">{r.translation_name}</span>
                    </div>
                    <p className="scheherazade-font text-lg sm:text-xl text-[#322010] dark:text-slate-100 select-text py-0.5" style={{ lineHeight: 2.2 }}>
                      {highlightText(r.text, query)}
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#aa8e67] group-hover:text-[#b58a43] shrink-0 mt-1 transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white dark:bg-[#152238] text-xs sm:text-sm font-semibold disabled:opacity-30 hover:border-[#8d6e47] transition-colors"
              >
                الصفحة السابقة
              </button>
              <span className="text-xs text-[#735535] dark:text-slate-400 font-mono">
                صفحة {page} من {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="px-4 py-2 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white dark:bg-[#152238] text-xs sm:text-sm font-semibold disabled:opacity-30 hover:border-[#8d6e47] transition-colors"
              >
                الصفحة التالية
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Chapter Reader (Manuscript Luxury Layout)
// ─────────────────────────────────────────────────────────
function ChapterReader({
  selectedTranslations,
  onSwitchPrimary,
  onToggleCheckbox,
  book,
  chapter,
  onOpenVerseModal,
  onOpenCollection,
  onNavigateChapter,
  onOpenScan,
  translations
}) {
  const isCompareMode = selectedTranslations.length >= 2;
  const activeSlugs = selectedTranslations.slice(0, 2);
  const { data, loading, error } = useChapter(activeSlugs, book, chapter);

  const [searchInChapter, setSearchInChapter] = useState('');
  const [fontSize, setFontSize] = useState(21); // Scheherazade New comfortable 18-24px
  const [isCanonExpanded, setIsCanonExpanded] = useState(false);

  const bookInfo = data?.book;
  const nav = data?.navigation;
  const canon = bookInfo?.canon_info;

  // Auto-switch to available translation if current selection is not available for this book
  useEffect(() => {
    if (data?.book?.available_translations?.length) {
      const avail = data.book.available_translations;
      const hasValid = selectedTranslations.some(s => avail.includes(s));
      if (!hasValid) {
        const target = data.activeTranslation && avail.includes(data.activeTranslation)
          ? data.activeTranslation
          : avail[0];
        onSwitchPrimary(target);
      }
    }
  }, [data, selectedTranslations, onSwitchPrimary]);

  if (loading) {
    return (
      <div className="text-center py-16 text-[#735535] font-scheherazade" dir="rtl">
        <div className="inline-block w-8 h-8 border-2 border-[#b58a43] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-semibold text-sm">جارٍ تحميل المخطوطة...</p>
      </div>
    );
  }

  if (error) return <p className="text-center py-8 text-red-500 font-bold font-scheherazade" dir="rtl">{error}</p>;
  if (!data) return null;

  const effectivePrimarySlug = (bookInfo?.available_translations?.includes(activeSlugs[0]))
    ? activeSlugs[0]
    : (data.activeTranslation || bookInfo?.available_translations?.[0] || activeSlugs[0]);
  const t1 = translations.find(t => t.slug === effectivePrimarySlug) || translations.find(t => t.slug === activeSlugs[0]);
  const t2 = isCompareMode ? translations.find(t => t.slug === activeSlugs[1]) : null;

  // Filter verses in chapter
  const versesList = (data.verses || []).filter(v => {
    if (!searchInChapter.trim()) return true;
    const q = searchInChapter.trim();
    if (isCompareMode && v.translations) {
      const txt1 = v.translations?.[activeSlugs[0]]?.text || v.text || '';
      const txt2 = v.translations?.[activeSlugs[1]]?.text || '';
      return txt1.includes(q) || txt2.includes(q) || v.verse.toString() === q;
    }
    return (v.text && v.text.includes(q)) ||
      (v.translations && Object.values(v.translations).some(t => t.text?.includes(q))) ||
      v.verse.toString() === q;
  });

  const handleCopyChapter = () => {
    let fullText = `${bookInfo?.collection_name_ar || 'البيبل'} — ${bookInfo?.name_ar} — الإصحاح ${chapter} (${t1?.name_ar})\n\n`;
    (data.verses || []).forEach(v => {
      const text = isCompareMode
        ? (v.translations?.[activeSlugs[0]]?.text || v.text)
        : (v.text || (v.translations && Object.values(v.translations)[0]?.text));
      fullText += `[${v.verse}] ${text || ''}\n`;
    });
    copyToClipboard(fullText);
    alert('تم نسخ الإصحاح كاملاً مع توثيق الأعداد.');
  };

  const handlePillClick = (verseNum) => {
    const el = document.getElementById(`verse-${verseNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlighted');
      setTimeout(() => el.classList.remove('highlighted'), 2000);
    }
  };

  return (
    <div dir="rtl" className="animate-fadeIn font-scheherazade">
      
      {/* DOCUMENT NAVIGATION & TOOLBAR */}
      <div className="luxury-border bg-[#fdfbf7]/95 dark:bg-[#152238]/95 backdrop-blur-md rounded-2xl p-3.5 mb-5 transition-all">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Reference Tag & Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#735535] to-[#322010] flex items-center justify-center shadow-md text-[#fdfbf7] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#735535] dark:text-slate-300">
                <span>البيبل</span>
                <ChevronLeft className="w-3 h-3 text-[#aa8e67]" />
                <button type="button" onClick={() => onOpenCollection(bookInfo?.collection_slug)} className="rounded bg-[#efe8dc] px-2 py-0.5 text-[11px] font-bold text-[#46301b] transition-colors hover:bg-[#e7dac4] hover:text-[#8d6e47] dark:bg-slate-800 dark:text-[#f8f3ea] dark:hover:bg-slate-700" title="فتح مجموعة الأسفار">
                  {bookInfo?.collection_name_ar || 'الأسفار'}
                </button>
                <ChevronLeft className="w-3 h-3 text-[#aa8e67]" />
                <span className="font-extrabold text-[#322010] dark:text-slate-100">{bookInfo?.name_ar}</span>
                <ChevronLeft className="w-3 h-3 text-[#aa8e67]" />
                <span className="rounded bg-[#f0e6d2] px-2 py-0.5 text-[11px] font-extrabold text-[#322010] dark:bg-slate-700 dark:text-[#fdfbf7]">الإصحاح {chapter}</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-[#322010] dark:text-slate-100 flex items-center gap-2 mt-0.5 scheherazade-font">
                {bookInfo?.name_ar} — الإصحاح {chapter}
              </h1>
            </div>
          </div>

          {/* Church Canon Stance Button in Header */}
          {canon && (
            <div className="flex items-center">
              <button
                onClick={() => setIsCanonExpanded(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  isCanonExpanded
                    ? 'bg-gradient-to-r from-[#8d6e47] to-[#735535] text-white border-[#735535]'
                    : 'bg-white/90 dark:bg-[#111a2e] text-[#46301b] dark:text-slate-200 border-[#ddcfb8] dark:border-slate-700 hover:border-[#b58a43]'
                }`}
                title="انقر لعرض توثيق موقف الكنائس والمجامع والمخطوطات"
              >
                <Landmark className={`w-3.5 h-3.5 ${isCanonExpanded ? 'text-white' : 'text-[#b58a43]'}`} />
                <span>موقف الكنائس:</span>
                {canon.is_disputed || bookInfo?.is_disputed ? (
                  <span className="px-2 py-0.2 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                    سفر مختلف فيه
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-md bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                    محل إجماع كنسي
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCanonExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          {/* Controls: Search in Chapter, Font Resizer */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            
            {/* Search in Chapter */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8d6e47]" />
              <input
                type="text"
                value={searchInChapter}
                onChange={e => setSearchInChapter(e.target.value)}
                placeholder="بحث في الأعداد..."
                className="w-full sm:w-40 bg-white/90 dark:bg-[#111a2e] text-[#322010] dark:text-slate-100 font-scheherazade scheherazade-font text-base font-bold placeholder:font-scheherazade pr-8 pl-2.5 py-1.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 focus:outline-none focus:border-[#8d6e47]"
              />
            </div>

            {/* Font Size Resizer */}
            <div className="flex items-center bg-white/80 dark:bg-[#111a2e] border border-[#ddcfb8] dark:border-slate-700 rounded-xl p-0.5 gap-1">
              <button
                onClick={() => setFontSize(s => Math.max(16, s - 2))}
                title="تصغير الخط"
                className="w-7 h-7 flex items-center justify-center text-[#5c4127] dark:text-slate-300 hover:bg-[#f8f3ea] dark:hover:bg-slate-800 rounded-lg transition-all text-xs font-bold cursor-pointer"
              >
                A-
              </button>
              <span className="text-[10px] text-[#ddcfb8] dark:text-slate-700">|</span>
              <button
                onClick={() => setFontSize(s => Math.min(36, s + 2))}
                title="تكبير الخط"
                className="w-7 h-7 flex items-center justify-center text-[#5c4127] dark:text-slate-300 hover:bg-[#f8f3ea] dark:hover:bg-slate-800 rounded-lg transition-all text-xs font-bold cursor-pointer"
              >
                A+
              </button>
            </div>

          </div>

        </div>

        {/* Expanded Canon Details Dropdown */}
        {isCanonExpanded && canon && (
          <div className="mt-3 pt-3 border-t border-[#ddcfb8]/60 dark:border-slate-800 space-y-2.5 text-xs sm:text-sm animate-fadeIn">
            {canon.accepted_by && canon.accepted_by.length > 0 && (
              <div className="bg-white/90 dark:bg-[#1a2942] p-3 rounded-xl border border-emerald-500/30">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>الكنائس التي تعترف به ككتاب قانوني موحى به:</span>
                </div>
                <ul className="space-y-1 pr-2 text-xs">
                  {canon.accepted_by.map((item, i) => (
                    <li key={i} className="text-[#322010] dark:text-slate-200 leading-relaxed flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canon.rejected_by && canon.rejected_by.length > 0 && (
              <div className="bg-white/90 dark:bg-[#1a2942] p-3 rounded-xl border border-rose-500/30">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-400 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>الكنائس والتقاليد التي لا تعترف بقانونيته (تعتبره من الأبوكريفا):</span>
                </div>
                <ul className="space-y-1 pr-2 text-xs">
                  {canon.rejected_by.map((item, i) => (
                    <li key={i} className="text-[#322010] dark:text-slate-200 leading-relaxed flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canon.notes && (
              <div className="bg-white/90 dark:bg-[#1a2942] p-2.5 rounded-xl border border-[#ddcfb8]/60 dark:border-slate-800 text-[#5c4127] dark:text-slate-300 text-xs leading-relaxed">
                <span className="font-bold text-[#322010] dark:text-slate-100 ml-1">📜 توثيق المخطوطات والترجمات:</span>
                {canon.notes}
              </div>
            )}
          </div>
        )}

        {bookInfo?.metadata && !['old-testament', 'new-testament'].includes(bookInfo.collection_slug) && (
          <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2.5 text-xs leading-6 text-[#5c4127] dark:text-slate-300" dir="rtl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
              <span>حالة النص: {catalogStatusLabel(bookInfo.metadata.text_status)}</span>
              <span>اللغة الأصلية: {bookInfo.metadata.original_language || 'غير محددة'}</span>
              <span>العربية: {bookInfo.metadata.arabic_status === 'planned' ? 'الترجمة العربية قيد الإعداد' : catalogStatusLabel(bookInfo.metadata.arabic_status)}</span>
            </div>
            {bookInfo.metadata.source_url && (
              <a href={bookInfo.metadata.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-blue-700 underline decoration-blue-300 underline-offset-2 dark:text-blue-300">
                مصدر الفهرسة والطبعة
                <ArrowLeft className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/^SAM-/.test(book) && <ScanBookLinks bookCode={book} textualTradition="sam" onOpenScan={onOpenScan} />}

        {/* Translation Selector Chips */}
        <div className="mt-3 pt-2.5 border-t border-[#ddcfb8]/60 dark:border-slate-800">
          <TranslationSelectorChips
            translations={translations}
            selectedSlugs={selectedTranslations}
            availableSlugs={bookInfo?.available_translations || []}
            primarySlug={activeSlugs[0]}
            onSwitchPrimary={onSwitchPrimary}
            onToggleCheckbox={onToggleCheckbox}
            isChapterMode={true}
          />
        </div>

        {/* Verse Jump Pills Navigation */}
        <div className="mt-2.5 pt-2 border-t border-[#ddcfb8]/60 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-[#735535] dark:text-slate-400 shrink-0 ml-2">الانتقال للعدد:</span>
          <div className="flex items-center gap-1.5">
            {(data.verses || []).map(v => (
              <button
                key={v.verse}
                onClick={() => handlePillClick(v.verse)}
                className="w-7 h-7 rounded-lg text-xs font-bold bg-white dark:bg-[#111a2e] border border-[#ddcfb8] dark:border-slate-700 text-[#5c4127] dark:text-slate-200 hover:bg-[#735535] hover:text-[#fdfbf7] transition-all shrink-0 shadow-sm cursor-pointer"
              >
                {v.verse}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* MANUSCRIPT DOCUMENT CARD */}
      <main className="luxury-border bg-[#fdfbf7]/85 dark:bg-[#152238]/90 rounded-3xl p-4 sm:p-7 shadow-luxury relative overflow-hidden">
        
        {/* Background Decorative Seal */}
        <div className="absolute -left-10 -top-10 opacity-[0.03] pointer-events-none select-none text-[#322010] dark:text-white">
          <Award className="w-72 h-72" />
        </div>

        {/* Chapter Heading Header */}
        <div className="text-center mb-5 pb-3 border-b border-[#ddcfb8]/70 dark:border-slate-800 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-[#111a2e] border border-[#ddcfb8] dark:border-slate-700 text-[#5c4127] dark:text-slate-200 text-xs font-bold mb-1.5 shadow-sm">
            <Scroll className="w-3.5 h-3.5 text-[#b58a43]" />
            <span>البيبل — {bookInfo?.collection_name_ar}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#322010] dark:text-slate-100 scheherazade-font mt-1 mb-1.5 tracking-wide leading-tight">
            {bookInfo?.name_ar} — الإصحاح {chapter}
          </h2>

          <div className="divider-ornament max-w-xs mx-auto text-sm my-1.5 scheherazade-font">
            ✤ ✦ ✤
          </div>

          <p className="text-xs text-[#735535] dark:text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
            انقر على أي عدد لعرضه في المودال المكبر والراقي مع خيارات النسخ والتنقل.
          </p>
        </div>

        {/* Verses Content */}
        {versesList.length === 0 ? (
          <div className="text-center py-12 px-4 font-scheherazade my-4 bg-white/60 dark:bg-[#111a2e]/60 rounded-2xl border border-dashed border-[#ddcfb8] dark:border-slate-800">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#efe8dc] dark:bg-slate-800 text-[#8d6e47] flex items-center justify-center border border-[#ddcfb8]">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#322010] dark:text-slate-100 mb-1">
              {searchInChapter ? 'لا توجد أعداد تطابق البحث في هذا الإصحاح' : 'لا تتوفر نصوص مفهرسة لهذا الإصحاح حالياً'}
            </h3>
            <p className="text-xs text-[#735535] dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchInChapter ? 'جرّب البحث بكلمة أخرى أو مسح خانة البحث.' : (bookInfo?.available_translations?.length ? 'اختر ترجمة أخرى من شريط الترجمات أعلاه.' : 'هذا السفر مسجل في الفهرس الكنسي ولم تكتمل فهرسة نصوصه في قاعدة البيانات بعد.')}
            </p>
          </div>
        ) : isCompareMode ? (
          /* ── Parallel Comparison View (2 Columns) ── */
          <div className="space-y-3 mb-6">
            <div className="hidden md:grid grid-cols-2 gap-3 pb-2 border-b border-[#ddcfb8] dark:border-slate-800 font-bold text-xs">
              <div className="bg-[#f0e6d2] dark:bg-slate-800 px-3 py-1.5 rounded-xl text-[#46301b] dark:text-[#f8f3ea] font-extrabold border border-[#ddcfb8]">
                {t1?.name_ar || 'الترجمة الأولى'}
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl text-blue-900 dark:text-blue-200 font-extrabold border border-blue-200 dark:border-blue-900">
                {t2?.name_ar || 'الترجمة الثانية'}
              </div>
            </div>

            {versesList.map(group => {
              const v1 = group.translations?.[activeSlugs[0]];
              const v2 = group.translations?.[activeSlugs[1]];

              return (
                <div
                  key={group.verse}
                  id={`verse-${group.verse}`}
                  className="verse-card p-3 sm:p-4 rounded-2xl border border-[#ddcfb8] dark:border-slate-800 bg-white/70 dark:bg-[#111a2e]/80 my-1.5 transition-all relative"
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#f8f3ea] dark:border-slate-800">
                    <button
                      onClick={() => onOpenVerseModal(book, chapter, group.verse)}
                      className="font-bold text-xs px-2.5 py-0.5 rounded-xl bg-[#efe8dc] dark:bg-slate-800 text-[#46301b] dark:text-[#f8f3ea] border border-[#ddcfb8] dark:border-slate-700 flex items-center gap-1 shadow-sm hover:bg-[#735535] hover:text-white transition-all cursor-pointer"
                      title="عرض هذا العدد مفرداً ومكبراً"
                    >
                      <span>العدد {group.verse}</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => {
                        copyToClipboard(`${bookInfo?.name_ar} ${chapter}:${group.verse}\n[${t1?.name_ar}]: ${v1?.text || ''}\n[${t2?.name_ar}]: ${v2?.text || ''}`);
                        alert('تم نسخ العدد بالترجمتين.');
                      }}
                      className="p-1 hover:bg-[#f0e6d2] dark:hover:bg-slate-800 rounded-lg text-[#735535] dark:text-slate-400 transition-colors cursor-pointer"
                      title="نسخ العدد بكلا الترجمتين"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => onOpenVerseModal(book, chapter, group.verse)}
                      className="p-2.5 rounded-xl bg-[#fdfbf7]/60 dark:bg-[#152238]/60 cursor-pointer hover:bg-[#b58a43]/5 transition-colors"
                    >
                      <span className="block text-[11px] font-bold text-[#8d6e47] dark:text-[#c2a578] md:hidden mb-1">
                        {t1?.name_ar}:
                      </span>
                      <p className="scheherazade-font text-[#322010] dark:text-slate-100 select-text" style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}>
                        {v1?.text || <span className="text-[#aa8e67] text-sm">غير متوفر</span>}
                      </p>
                    </div>

                    <div
                      onClick={() => onOpenVerseModal(book, chapter, group.verse)}
                      className="p-2.5 rounded-xl bg-[#fdfbf7]/60 dark:bg-[#152238]/60 cursor-pointer hover:bg-[#b58a43]/5 transition-colors"
                    >
                      <span className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 md:hidden mb-1">
                        {t2?.name_ar}:
                      </span>
                      <p className="scheherazade-font text-[#322010] dark:text-slate-100 select-text" style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}>
                        {v2?.text || <span className="text-[#aa8e67] text-sm">غير متوفر</span>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Single Translation List (Manuscript Cards) ── */
          <div className="space-y-2 mb-6">
            {versesList.map(v => {
              const verseText = v.text || (v.translations && (v.translations[effectivePrimarySlug]?.text || Object.values(v.translations)[0]?.text)) || '';
              return (
              <div
                key={v.verse}
                id={`verse-${v.verse}`}
                onClick={() => onOpenVerseModal(book, chapter, v.verse)}
                className="verse-card p-2.5 sm:p-3.5 rounded-2xl border border-[#ddcfb8]/80 dark:border-slate-800 bg-white/70 dark:bg-[#111a2e]/80 flex gap-3 items-start cursor-pointer group transition-all my-1.5 relative"
              >
                {/* Verse Number Badge */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVerseModal(book, chapter, v.verse);
                  }}
                  title="عرض هذا العدد مفرداً ومكبراً"
                  className="font-bold text-xs min-w-[28px] h-[28px] rounded-lg bg-[#efe8dc] dark:bg-slate-800 text-[#46301b] dark:text-[#f8f3ea] border border-[#ddcfb8] dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:bg-[#735535] group-hover:text-white group-hover:border-[#5c4127] transition-all cursor-pointer"
                >
                  {v.verse}
                </button>

                {/* Verse Text with Scheherazade Font and balanced line-height */}
                <div className="flex-1 pr-0.5">
                  <p
                    className="verse-text scheherazade-font tracking-wide text-[#322010] dark:text-slate-100 font-normal select-text py-0.5"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}
                  >
                    {highlightText(verseText, searchInChapter)}
                  </p>
                </div>

                {/* Quick Copy */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5 text-[#735535] dark:text-slate-400 hidden sm:flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(`"${verseText}" — (${bookInfo?.name_ar} ${chapter}:${v.verse})`);
                      alert('تم نسخ العدد.');
                    }}
                    title="نسخ العدد"
                    className="p-1 hover:bg-[#efe8dc] dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Footer Citation Signature & Chapter Copy */}
        <div className="mt-10 pt-5 border-t border-[#ddcfb8]/70 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-[#735535] dark:text-slate-400 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#efe8dc] dark:bg-slate-800 border border-[#ddcfb8] dark:border-slate-700 flex items-center justify-center text-[#5c4127] dark:text-slate-300">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold">توثيق معتمد — رفيق المحاور</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyChapter}
              className="hover:text-[#322010] dark:hover:text-white font-bold flex items-center gap-1.5 transition-colors bg-white dark:bg-[#111a2e] px-3.5 py-1.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5 text-[#735535] dark:text-[#c2a578]" />
              <span>نسخ الإصحاح كاملًا</span>
            </button>
            <span className="text-[#322010] dark:text-slate-200 font-bold bg-[#efe8dc] dark:bg-slate-800 px-3 py-1 rounded-lg border border-[#ddcfb8] dark:border-slate-700 font-mono">
              {(data.verses || []).length} عدداً
            </span>
          </div>
        </div>

        {/* Chapter Navigation Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#ddcfb8]/70 dark:border-slate-800">
          <button
            onClick={() => nav?.prevChapter && onNavigateChapter(nav.prevChapter.bookCode, nav.prevChapter.chapter)}
            disabled={!nav?.prevChapter}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white dark:bg-[#111a2e] text-xs sm:text-sm font-bold text-[#322010] dark:text-slate-100 disabled:opacity-30 hover:border-[#8d6e47] transition-colors shadow-sm"
          >
            <ArrowRight className="w-4 h-4 text-[#735535] dark:text-slate-300" />
            <span>الإصحاح السابق</span>
          </button>

          <span className="text-xs sm:text-sm text-[#735535] dark:text-slate-300 font-bold">
            {bookInfo?.name_ar} {chapter}
          </span>

          <button
            onClick={() => nav?.nextChapter && onNavigateChapter(nav.nextChapter.bookCode, nav.nextChapter.chapter)}
            disabled={!nav?.nextChapter}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white dark:bg-[#111a2e] text-xs sm:text-sm font-bold text-[#322010] dark:text-slate-100 disabled:opacity-30 hover:border-[#8d6e47] transition-colors shadow-sm"
          >
            <span>الإصحاح التالي</span>
            <ArrowLeft className="w-4 h-4 text-[#735535] dark:text-slate-300" />
          </button>
        </div>

      </main>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Elegant Single Verse Focus Modal (المودال المكبر والراقي)
// ─────────────────────────────────────────────────────────
function VerseFocusModal({
  isOpen,
  onClose,
  book,
  chapter,
  verse,
  selectedTranslations,
  onSwitchPrimary,
  onToggleCheckbox,
  translations,
  onNavigateVerse
}) {
  const { data, compareResults, loading, error } = useVerse(
    selectedTranslations, book, chapter, verse
  );

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && data?.navigation?.next) {
        onNavigateVerse(data.navigation.next.bookCode, data.navigation.next.chapter, data.navigation.next.verse);
      } else if (e.key === 'ArrowRight' && data?.navigation?.prev) {
        onNavigateVerse(data.navigation.prev.bookCode, data.navigation.prev.chapter, data.navigation.prev.verse);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, data, onNavigateVerse, onClose]);

  if (!isOpen) return null;

  const bookInfo = data?.book;
  const nav = data?.navigation;

  // Auto-switch to available translation if current selection is not available for this book
  useEffect(() => {
    if (!isOpen || !data?.book?.available_translations?.length) return;
    const avail = data.book.available_translations;
    const hasValid = selectedTranslations.some(s => avail.includes(s));
    if (!hasValid) {
      const target = data.activeTranslation && avail.includes(data.activeTranslation)
        ? data.activeTranslation
        : avail[0];
      onSwitchPrimary(target);
    }
  }, [isOpen, data, selectedTranslations, onSwitchPrimary]);

  const effectivePrimarySlug = (bookInfo?.available_translations?.includes(selectedTranslations[0]))
    ? selectedTranslations[0]
    : (data?.activeTranslation || bookInfo?.available_translations?.[0] || selectedTranslations[0]);
  const primarySlug = effectivePrimarySlug;
  const primaryTrans = translations.find(t => t.slug === primarySlug) || translations.find(t => t.slug === selectedTranslations[0]);

  // Filter compare results by user selection
  const displayResults = (compareResults || []).filter(r =>
    selectedTranslations.includes(r.translation_slug)
  );

  const primaryVerseObj = displayResults.find(r => r.translation_slug === primarySlug) || displayResults[0] || (data?.verses && data.verses[0]);

  const copyWithCitation = () => {
    if (!primaryVerseObj) return;
    const formatted = `"${primaryVerseObj.text}"\n— (${bookInfo?.collection_name_ar || 'البيبل'} - ${bookInfo?.name_ar} ${chapter} : ${verse} - ${primaryVerseObj.translation_name || primaryTrans?.name_ar})`;
    copyToClipboard(formatted);
    showToast('تم النسخ مع التوثيق الكامل!');
  };

  const copyTextOnly = () => {
    if (!primaryVerseObj) return;
    copyToClipboard(primaryVerseObj.text);
    showToast('تم نسخ النص مجرداً!');
  };

  return (
    <div className="fixed inset-0 bg-[#322010]/60 dark:bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto font-scheherazade animate-fadeIn" dir="rtl">
      
      <div className="max-w-3xl w-full flex flex-col gap-3.5 my-auto relative">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#46301b] dark:text-slate-200 bg-[#efe8dc]/95 dark:bg-[#152238]/95 backdrop-blur px-3 py-1.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-[#b58a43]" />
            <span>{bookInfo?.collection_name_ar || 'البيبل'}</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white dark:bg-[#152238] hover:bg-[#efe8dc] dark:hover:bg-slate-800 text-[#322010] dark:text-slate-200 border border-[#ddcfb8] dark:border-slate-700 transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
          >
            <span>إغلاق</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PURE TEXT MANUSCRIPT CARD */}
        <div className="bg-[#fdfbf7] dark:bg-[#152238] rounded-3xl p-6 sm:p-10 luxury-border shadow-modal-card relative overflow-hidden">
          
          {/* Background Decorative Seal */}
          <div className="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none select-none text-[#322010] dark:text-white">
            <Award className="w-64 h-64" />
          </div>

          {/* Reference Header Pill */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white dark:bg-[#111a2e] border border-[#ddcfb8] dark:border-slate-700 shadow-sm">
              <Bookmark className="w-4 h-4 text-[#b58a43]" />
              <span className="font-bold text-sm sm:text-base text-[#322010] dark:text-slate-100 scheherazade-font">
                {bookInfo?.name_ar} {chapter} : {verse}
              </span>
              <span className="text-xs font-bold text-[#8d6e47] dark:text-slate-400 border-r border-[#ddcfb8] dark:border-slate-700 pr-2 mr-1">
                {primaryVerseObj?.translation_name || primaryTrans?.name_ar}
              </span>
            </div>
          </div>

          {/* Focused Primary Verse */}
          {loading ? (
            <div className="text-center py-8 text-[#735535]">
              <div className="inline-block w-6 h-6 border-2 border-[#b58a43] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-bold">جارٍ الجلب...</p>
            </div>
          ) : (
            <div className="min-h-[90px] flex items-center justify-center my-2 text-center px-2">
              <p
                className="scheherazade-font text-xl sm:text-2xl md:text-3xl text-[#322010] dark:text-slate-100 font-medium select-all py-2"
                style={{ lineHeight: 2.2, wordSpacing: '1px' }}
              >
                {primaryVerseObj?.text || error || 'هذا النص غير متوفر في هذه الترجمة.'}
              </p>
            </div>
          )}

          {/* Stacked Additional Translations (when multiple selected) */}
          {displayResults.length > 1 && (
            <div className="mt-4 pt-4 border-t border-[#ddcfb8]/60 dark:border-slate-800 space-y-3">
              {displayResults.slice(1).map((r, i) => (
                <div key={i} className="bg-white/80 dark:bg-[#111a2e]/80 p-3.5 rounded-2xl border border-[#ddcfb8] dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#f8f3ea] dark:border-slate-800">
                    <span className="text-xs font-bold text-[#8d6e47] dark:text-[#c2a578]">
                      {r.translation_name}
                    </span>
                    <button
                      onClick={() => {
                        copyToClipboard(`"${r.text}" — (${bookInfo?.name_ar} ${chapter}:${verse} - ${r.translation_name})`);
                        showToast(`تم نسخ نص ${r.translation_name}`);
                      }}
                      className="p-1 hover:bg-[#efe8dc] dark:hover:bg-slate-800 rounded text-[#735535] dark:text-slate-400 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="scheherazade-font text-lg sm:text-xl text-[#322010] dark:text-slate-200" style={{ lineHeight: 2.2 }}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="divider-ornament max-w-xs mx-auto text-[#8d6e47] my-3 text-sm scheherazade-font">
            ❖ ─── ❖
          </div>

        </div>

        {/* ACTIONS & NAVIGATION PANELS */}
        <div className="flex flex-col gap-2.5">
          
          {/* Action Bar: Translations on the Right, Copy Buttons on the Left */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#efe8dc]/95 dark:bg-[#152238]/95 backdrop-blur p-2.5 sm:p-3 rounded-2xl border border-[#ddcfb8]/80 dark:border-slate-700 shadow-md">
            
            {/* Right: Four Translations with Direct Switch and Comparison Checkboxes */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#735535] dark:text-slate-300 ml-1">الترجمات:</span>
              {translations.filter(t => (bookInfo?.available_translations || []).includes(t.slug)).map(t => {
                const isSelected = selectedTranslations.includes(t.slug);
                const isPrimary = primarySlug === t.slug;

                return (
                  <div
                    key={t.slug}
                    className={`flex items-center rounded-xl border text-xs font-bold transition-all shadow-sm ${
                      isSelected
                        ? 'bg-white dark:bg-[#1a2942] border-[#8d6e47] text-[#322010] dark:text-[#f8f3ea]'
                        : 'bg-white/70 dark:bg-[#111a2e] border-[#ddcfb8] dark:border-slate-800 text-[#735535] dark:text-slate-400 hover:border-[#b58a43]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCheckbox(t.slug);
                      }}
                      className="p-1.5 pr-2 hover:text-[#b58a43] transition-colors cursor-pointer"
                      title="تحديد للمقارنة المتعددة"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#8d6e47] dark:text-[#c2a578] shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#aa8e67] dark:text-slate-600 shrink-0" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSwitchPrimary(t.slug)}
                      className={`py-1 pl-2.5 pr-1 text-right transition-colors cursor-pointer ${
                        isPrimary ? 'font-black text-[#5c4127] dark:text-[#f0e6d2] underline decoration-[#b58a43] decoration-2' : ''
                      }`}
                      title={`انقر للقراءة المباشرة بترجمة ${t.name_ar}`}
                    >
                      <span>{t.name_ar}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Left: Copy Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyWithCitation}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8d6e47] to-[#735535] hover:from-[#735535] hover:to-[#5c4127] text-[#fdfbf7] font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ مع التوثيق</span>
              </button>
              
              <button
                onClick={copyTextOnly}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111a2e] hover:bg-[#f8f3ea] dark:hover:bg-slate-800 border border-[#ddcfb8] dark:border-slate-700 text-[#46301b] dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#735535] dark:text-[#c2a578]" />
                <span>نسخ النص فقط</span>
              </button>
            </div>
          </div>

          {/* Toast Alert Message */}
          {toastMessage && (
            <div className="text-center animate-slideUp">
              <div className="text-xs font-bold text-[#322010] dark:text-slate-100 bg-white dark:bg-[#152238] border border-[#b58a43] py-1 px-4 rounded-full inline-block shadow-sm">
                {toastMessage}
              </div>
            </div>
          )}

          {/* Modal Navigation Footer */}
          <div className="flex items-center justify-between bg-[#efe8dc]/95 dark:bg-[#152238]/95 backdrop-blur px-4 py-2 rounded-2xl border border-[#ddcfb8]/80 dark:border-slate-700 shadow-md">
            <button
              onClick={() => nav?.prev && onNavigateVerse(nav.prev.bookCode, nav.prev.chapter, nav.prev.verse)}
              disabled={!nav?.prev}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#111a2e] hover:bg-[#f8f3ea] dark:hover:bg-slate-800 border border-[#ddcfb8] dark:border-slate-700 text-[#46301b] dark:text-slate-200 text-xs font-bold disabled:opacity-30 transition-all shadow-sm"
            >
              <ArrowRight className="w-4 h-4 text-[#735535] dark:text-[#c2a578]" />
              <span>العدد السابق</span>
            </button>

            <span className="text-xs text-[#46301b] dark:text-slate-300 font-bold bg-white dark:bg-[#111a2e] px-3.5 py-1 rounded-xl border border-[#ddcfb8] dark:border-slate-700 shadow-sm font-mono">
              {verse}
            </span>

            <button
              onClick={() => nav?.next && onNavigateVerse(nav.next.bookCode, nav.next.chapter, nav.next.verse)}
              disabled={!nav?.next}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#111a2e] hover:bg-[#f8f3ea] dark:hover:bg-slate-800 border border-[#ddcfb8] dark:border-slate-700 text-[#46301b] dark:text-slate-200 text-xs font-bold disabled:opacity-30 transition-all shadow-sm"
            >
              <span>العدد التالي</span>
              <ArrowLeft className="w-4 h-4 text-[#735535] dark:text-[#c2a578]" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Books Grid for a Collection
// ─────────────────────────────────────────────────────────
function BooksGrid({ collectionSlug, onOpenChapter, translations }) {
  const { books, loading } = useBooks(collectionSlug);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-[#efe8dc]/60 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!books.length) return <p className="text-center py-6 text-[#aa8e67]">لا توجد بيانات متاحة.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 font-scheherazade">
      {books.map(b => {
        const isDeutero = b.collection_slug === 'deuterocanon';
        const isApocrypha = ['apocrypha', 'pseudepigrapha'].includes(b.collection_slug);
        const isReady = (b.available_translations || []).length > 0;
        const isCatalogOnly = !isReady && b.metadata?.text_status === 'not_imported';

        return (
          <button
            key={b.code}
            onClick={() => isReady && onOpenChapter(b.code, 1)}
            disabled={!isReady}
            title={isCatalogOnly ? 'هذا العمل مفهرس، والنص قيد الإعداد' : undefined}
            className={`verse-card p-3.5 sm:p-4 text-right flex items-center justify-between gap-2.5 border border-[#ddcfb8] dark:border-slate-800 bg-white/80 dark:bg-[#152238] rounded-2xl transition-all group shadow-sm ${isReady ? 'hover:border-[#b58a43] hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#b58a43] dark:text-[#c2a578] font-bold font-mono text-xs bg-[#b58a43]/10 dark:bg-[#b58a43]/20 px-2 py-0.5 rounded-lg shrink-0">
                  {b.book_number || b.id}
                </span>
                <span className="font-bold text-sm sm:text-base leading-relaxed text-[#322010] dark:text-slate-100 group-hover:text-[#8d6e47] dark:group-hover:text-[#c2a578] transition-colors line-clamp-2">
                  {b.name_ar}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-[#8d6e47] dark:text-slate-400">
                <span className="font-medium">
                  {b.chapter_count || 0} {b.chapter_count === 1 ? 'إصحاح واحد' : 'إصحاحاً'}
                </span>
                {isReady && (
                  <span className="basis-full text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    اللغات: {[...new Set((b.available_translations || []).map(slug => translations.find(t => t.slug === slug)?.language).filter(Boolean))].map(language => ({ en: 'الإنجليزية', ar: 'العربية', la: 'اللاتينية', syr: 'السريانية', gez: 'الجعزية', grc: 'اليونانية', arc: 'الآرامية' }[language] || language)).join('، ') || 'متاحة'}
                  </span>
                )}
                {!isReady && <span className="font-bold text-slate-500 dark:text-slate-400">مدخل فهرسي</span>}
                {isDeutero && (
                  <span className="text-[10px] text-[#735535] dark:text-[#d5be98] bg-[#f0e6d2] dark:bg-slate-800 px-1.5 py-0.2 rounded-md font-bold">
                    قانوني ثانٍ
                  </span>
                )}
                {isApocrypha && (
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md font-bold">
                    أبوكريفا
                  </span>
                )}
                {isCatalogOnly && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-500/10 dark:bg-slate-500/20 px-1.5 py-0.5 rounded-md font-bold">
                    النص قيد الإعداد
                  </span>
                )}
              </div>
            </div>

            <ChevronLeft className="w-4 h-4 text-[#aa8e67] group-hover:text-[#8d6e47] group-hover:-translate-x-0.5 transition-all shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Chapter List Picker
// ─────────────────────────────────────────────────────────
function ChapterPicker({ translation, book, onSelect }) {
  const [chapters, setChapters] = useState([]);
  useEffect(() => {
    if (!book || !translation) return;
    fetch(`/api/bible/chapters?translation=${translation}&book=${book}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setChapters(d.chapters);
      });
  }, [translation, book]);

  if (!chapters.length) return null;

  return (
    <div className="flex flex-wrap gap-2 font-scheherazade">
      {chapters.map(c => (
        <button
          key={c.chapter}
          onClick={() => onSelect(c.chapter)}
          className="w-11 h-11 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white dark:bg-[#111a2e] text-sm font-bold text-[#322010] dark:text-slate-100 hover:border-[#8d6e47] hover:text-[#8d6e47] hover:bg-[#f8f3ea] dark:hover:bg-slate-800 transition-all flex items-center justify-center shadow-sm"
        >
          {c.chapter}
        </button>
      ))}
    </div>
  );
}

function BibleLanding({
  translations,
  books,
  searchTranslations,
  searchCollections,
  onToggleSearchTranslation,
  onToggleSearchCollection,
  onSelectAllSearchTranslations,
  onSelectDefaultSearchTranslation,
  onSearch,
  onQuickNavigate,
  onOpenChapter,
  onOpenCollection
}) {
  const collections = useCollections();

  const colIcons = {
    'old-testament': '📜',
    'new-testament': '✝️',
    'deuterocanon': '📖',
    'apocrypha': '📚',
    'ethiopian-canon': '⛪',
    'textual-traditions': '🪶',
    'church-writings': '📜',
    'pseudepigrapha': '🗂️',
  };

  return (
    <div dir="rtl" className="animate-fadeIn space-y-8 font-scheherazade">
      {/* Hero Header */}
      <div className="text-center pt-3 pb-1">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#8d6e47] to-[#322010] flex items-center justify-center shadow-lg text-[#fdfbf7]">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#322010] dark:text-slate-100 tracking-tight scheherazade-font">
          البيبل باللغة العربية
        </h1>
        <p className="text-[#735535] dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          الموثق الرقمي — تصفح، بحث، ومقارنة فورية مع توثيق مواقف الكنائس والمجامع
        </p>
      </div>

      {/* Search Box with Translation Selection */}
      <BibleSearchBox
        onSubmit={onSearch}
        translations={translations}
        selectedTranslations={searchTranslations}
        selectedCollections={searchCollections}
        onToggleTranslation={onToggleSearchTranslation}
        onToggleCollection={onToggleSearchCollection}
        onSelectAllTranslations={onSelectAllSearchTranslations}
        onSelectDefaultTranslation={onSelectDefaultSearchTranslation}
      />

      {/* Fast Selector / Quick Jumper */}
      <QuickNavigator books={books} onNavigate={onQuickNavigate} />

      {/* Sections / Canons Grid */}
      {collections.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-[#322010] dark:text-slate-100 mb-3 flex items-center gap-2">
            <span>أقسام الأسفار والتقاليد والنصوص:</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {collections.map(col => (
              <button
                key={col.slug}
                onClick={() => onOpenCollection(col.slug)}
                className="verse-card p-4 text-center border border-[#ddcfb8] dark:border-slate-800 bg-white/75 dark:bg-[#152238] rounded-2xl hover:border-[#b58a43] transition-all group shadow-sm"
              >
                <div className="text-2xl mb-1.5">{colIcons[col.slug] || '📄'}</div>
                <div className="font-extrabold text-[#322010] dark:text-slate-100 text-xs sm:text-sm mb-1 group-hover:text-[#8d6e47] transition-colors">
                  {col.name_ar}
                </div>
                {col.verseCount > 0 ? (
                  <div className="text-[11px] text-[#8d6e47] dark:text-[#d5be98] font-bold">
                    {col.verseCount.toLocaleString('ar-EG')} آية
                  </div>
                ) : (
                  <div className="text-[11px] text-[#aa8e67] dark:text-slate-500">متوفر للتصفح</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Testament Quick Grid */}
      <section className="rounded-3xl border border-blue-200/70 bg-blue-50/50 p-4 sm:p-5 dark:border-blue-900/60 dark:bg-blue-950/15">
        <h2 className="text-base font-extrabold text-[#322010] dark:text-slate-100 mb-3">
          أسفار العهد الجديد (الأناجيل والرسائل والرؤيا):
        </h2>
        <BooksGrid collectionSlug="new-testament" onOpenChapter={onOpenChapter} translations={translations} />
      </section>

      {/* Old Testament Quick Grid */}
      <section className="rounded-3xl border border-amber-200/70 bg-amber-50/50 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/15">
        <h2 className="text-base font-extrabold text-[#322010] dark:text-slate-100 mb-3">
          أسفار العهد القديم:
        </h2>
        <BooksGrid collectionSlug="old-testament" onOpenChapter={onOpenChapter} translations={translations} />
      </section>

      {/* Deuterocanon Quick Grid */}
      <section className="rounded-3xl border border-violet-200/70 bg-violet-50/50 p-4 sm:p-5 dark:border-violet-900/60 dark:bg-violet-950/15">
        <h2 className="text-base font-extrabold text-[#322010] dark:text-slate-100 mb-3">
          الأسفار القانونية الثانية (المختلف عليها):
        </h2>
        <BooksGrid collectionSlug="deuterocanon" onOpenChapter={onOpenChapter} translations={translations} />
      </section>

      {/* Apocrypha / Ethiopian Canon Quick Grid */}
      <section className="rounded-3xl border border-emerald-200/70 bg-emerald-50/50 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/15">
        <h2 className="text-base font-extrabold text-[#322010] dark:text-slate-100 mb-3 flex items-center gap-2">
          <span>نصوص أبوكريفية وتقاليد إثيوبية وكنسية (أخنوخ، اليوبيلات، المكابيان الإثيوبي، وصية موسى، الدسقولية):</span>
        </h2>
        <BooksGrid collectionSlug="pseudepigrapha" onOpenChapter={onOpenChapter} translations={translations} />
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Collection View
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
//  الكتب الممسوحة (صور من أرشيف الإنترنت + نص عندنا)
// ─────────────────────────────────────────────────────────
let scanBooksPromise = null;
function useScanBooks() {
  const [scans, setScans] = useState([]);
  useEffect(() => {
    let cancelled = false;
    if (!scanBooksPromise) {
      scanBooksPromise = fetch('/api/bible/scans').then(r => r.json()).catch(() => ({ success: false }));
    }
    scanBooksPromise.then(d => { if (!cancelled && d.success) setScans(d.scans); });
    return () => { cancelled = true; };
  }, []);
  return scans;
}

// بطاقة تفتح الكتاب الممسوح: عند تمرير bookCode (مثل SAM-GEN) تفتح عند السفر المقابل، وبدونه تعرض كل الكتب.
function ScanBookLinks({ bookCode = null, textualTradition = null, onOpenScan }) {
  const scans = useScanBooks();
  const sectionCode = bookCode ? bookCode.replace(/^[A-Z]+-/, '') : null;
  const items = scans
    .filter(scan => !textualTradition || scan.textual_tradition === textualTradition)
    .map(scan => {
      const section = sectionCode ? scan.sections.find(item => item.code === sectionCode) : null;
      return { scan, section, page: section ? section.firstLeaf + 1 : 1 };
    })
    .filter(item => !sectionCode || item.section);
  if (!items.length) return null;
  return (
    <div className="mt-3 space-y-2" dir="rtl">
      {items.map(({ scan, section, page }) => (
        <button
          key={scan.slug}
          type="button"
          onClick={() => onOpenScan(scan.slug, page, '')}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#b58a43]/40 bg-[#fff8e8] px-3 py-3 text-right transition-colors hover:bg-[#f8ecd0] dark:border-[#c2a578]/30 dark:bg-[#1a2740] dark:hover:bg-[#223253]"
        >
          <span>
            <span className="block text-sm font-black text-[#322010] dark:text-slate-100">
              {section ? `${section.nameAr} في ` : ''}{scan.title_ar}
            </span>
            <span className="block text-xs leading-6 text-[#735535] dark:text-slate-400">
              {scan.editor_ar ? `تحقيق ${scan.editor_ar} · ` : ''}عرض صفحات الطبعة نفسها مع البحث داخل الكتاب، والنص عربي سامري
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 shrink-0 text-[#8d6e47]" />
        </button>
      ))}
    </div>
  );
}

function CollectionView({ collectionSlug, onOpenChapter, onOpenScan, onBack }) {
  const cols = useCollections();
  const col = cols.find(c => c.slug === collectionSlug);

  return (
    <div dir="rtl" className="animate-fadeIn font-scheherazade">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#ddcfb8] dark:border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-[#152238] border border-[#ddcfb8] dark:border-slate-700 hover:bg-[#efe8dc] text-[#735535] transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-[#322010] dark:text-slate-100">{col?.name_ar || 'الأقسام'}</h2>
      </div>
      {collectionSlug === 'textual-traditions' && <ScanBookLinks textualTradition="sam" onOpenScan={onOpenScan} />}
      <BooksGrid collectionSlug={collectionSlug} onOpenChapter={onOpenChapter} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Book View (Chapter Picker)
// ─────────────────────────────────────────────────────────
function BookView({ translation, book, onOpenChapter, onOpenScan, onBack }) {
  const [bookInfo, setBookInfo] = useState(null);
  useEffect(() => {
    fetch(`/api/bible/books/${book}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBookInfo(d.book); });
  }, [book]);

  return (
    <div dir="rtl" className="animate-fadeIn font-scheherazade">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ddcfb8] dark:border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-[#152238] border border-[#ddcfb8] dark:border-slate-700 hover:bg-[#efe8dc] text-[#735535] transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-[#322010] dark:text-slate-100">
            <span className="text-[#b58a43] font-mono text-base ml-1">[{bookInfo?.book_number || bookInfo?.id}]</span>
            {bookInfo?.name_ar || book}
          </h2>
          <span className="text-xs text-[#735535] dark:text-slate-400">اختر رقم الإصحاح للقراءة:</span>
        </div>
      </div>

      {/* Church Recognition Canon Info Box */}
      <BookCanonInfoBox bookInfo={bookInfo} />

      {/^SAM-/.test(book) && <ScanBookLinks bookCode={book} textualTradition="sam" onOpenScan={onOpenScan} />}

      <ChapterPicker translation={translation} book={book} onSelect={ch => onOpenChapter(book, ch)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Main Bible Section Router
// ─────────────────────────────────────────────────────────
export default function BibleSection({ initialBook, initialChapter, initialVerse, initialScan }) {
  const { translations } = useTranslations();
  const { books } = useBooks();

  const [selectedTranslations, setSelectedTranslations] = useState(() => (
    String(initialBook || '').toUpperCase() === '1ES'
      ? ['ar-mohammad-1es', 'grc-brenton-1es']
      : ['ar-svd']
  ));
  const [searchTranslations, setSearchTranslations] = useState(['default']);
  const [searchCollections, setSearchCollections] = useState(['old-testament', 'new-testament']);

  // Modal focus state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalVerse, setModalVerse] = useState(1);

  // Sync initial translations
  useEffect(() => {
    if (translations.length > 0) {
      setSelectedTranslations(prev => {
        const valid = prev.filter(slug => translations.some(t => t.slug === slug));
        if (valid.length > 0) return valid;
        return [translations[0].slug];
      });
    }
  }, [translations]);

  // View state: 'landing' | 'collection' | 'book' | 'chapter' | 'search'
  const [view, setView] = useState(() => {
    if (initialScan) return 'scan';
    if (initialBook && initialChapter) return 'chapter';
    if (initialBook) return 'book';
    return 'landing';
  });

  const [currentBook, setCurrentBook] = useState(initialBook || null);
  const [currentChapter, setCurrentChapter] = useState(initialChapter || null);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [currentScan, setCurrentScan] = useState(initialScan || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep the reader state synchronized with the browser Back/Forward buttons.
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      const nextBook = route.bibleBook || null;
      const nextChapter = route.bibleChapter || null;
      const nextVerse = route.bibleVerse || null;
      if (route.bibleScan) {
        setCurrentScan(route.bibleScan);
        setIsModalOpen(false);
        setView('scan');
        return;
      }
      setCurrentBook(nextBook);
      setCurrentChapter(nextChapter);
      setCurrentCollection(null);
      setModalVerse(nextVerse || 1);
      setIsModalOpen(Boolean(nextBook && nextChapter && nextVerse));
      setView(nextBook && nextChapter ? 'chapter' : nextBook ? 'book' : 'landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial modal open if verse specified in initial URL
  useEffect(() => {
    if (initialVerse && initialBook && initialChapter) {
      setModalVerse(parseInt(initialVerse));
      setIsModalOpen(true);
    }
  }, [initialVerse, initialBook, initialChapter]);

  // 1. Direct translation switch (when clicking translation name) -> SINGLE TRANSLATION MODE ONLY
  const handleSwitchPrimary = useCallback((slug) => {
    setSelectedTranslations([slug]);
  }, []);

  // 2. Checkbox toggle (when clicking checkbox icon)
  const handleToggleCheckbox = useCallback((slug) => {
    setSelectedTranslations(prev => {
      const isSelected = prev.includes(slug);

      if (view === 'chapter' && !isModalOpen) {
        if (isSelected) {
          if (prev.length <= 1) return prev;
          return prev.filter(s => s !== slug);
        } else {
          if (prev.length >= 2) {
            return [prev[0], slug];
          }
          return [...prev, slug];
        }
      } else {
        // Modal / Verse mode: unlimited
        if (isSelected) {
          if (prev.length <= 1) return prev;
          return prev.filter(s => s !== slug);
        } else {
          return [...prev, slug];
        }
      }
    });
  }, [view, isModalOpen]);

  // Search translations selection handlers
  const handleToggleSearchTranslation = useCallback((slug) => {
    setSearchTranslations(prev => {
      let list = prev.filter(s => s !== 'all' && s !== 'default');
      if (list.includes(slug)) {
        list = list.filter(s => s !== slug);
        if (list.length === 0) return ['default'];
        return list;
      } else {
        return [...list, slug];
      }
    });
  }, []);

  const handleSelectAllSearchTranslations = useCallback(() => {
    setSearchTranslations(['all']);
  }, []);

  const handleSelectDefaultSearchTranslation = useCallback(() => {
    setSearchTranslations(['default']);
  }, []);

  const handleToggleSearchCollection = useCallback((slug) => {
    setSearchCollections(prev => {
      if (prev.includes(slug)) {
        return prev.length > 1 ? prev.filter(item => item !== slug) : prev;
      }
      return [...prev, slug];
    });
  }, []);

  // Update browser URL & Title
  useEffect(() => {
    if (view === 'scan' && currentScan) {
      pushScanUrl({ slug: currentScan.slug, page: currentScan.page, query: currentScan.query });
    } else if (view === 'landing' || view === 'search' || view === 'collection' || view === 'book') {
      pushBibleUrl({});
    } else if (view === 'chapter') {
      if (isModalOpen && modalVerse) {
        pushBibleUrl({ book: currentBook, chapter: currentChapter, verse: modalVerse });
      } else {
        pushBibleUrl({ book: currentBook, chapter: currentChapter });
      }
    }

    const currentBookObj = books.find(b => b.code === currentBook);
    const bookTitle = currentBookObj ? currentBookObj.name_ar : currentBook;

    const titleSuffix = BIBLE_ONLY ? 'البيبل | Bible' : 'البيبل - رفيق المحاور';
    const pageTitle =
      isModalOpen && modalVerse
        ? `${bookTitle} ${currentChapter}:${modalVerse} - ${titleSuffix}`
        : view === 'chapter'
        ? `${bookTitle} ${currentChapter} - ${titleSuffix}`
        : view === 'scan' && currentScan
        ? `صفحات الترجمة العربية للتوراة السامريين${currentScan.page ? ` — صفحة ${currentScan.page}` : ''} - ${titleSuffix}`
        : titleSuffix;
    const summary = currentBookObj?.metadata?.summary_ar || 'موسوعة نصية لتصفح البيبل، قراءة الشواهد، البحث، والمقارنة بين الترجمات والتقاليد النصية.';
    const description = view === 'landing'
      ? 'البيبل باللغة العربية: تصفح الأسفار والأصحاحات والأعداد، وابحث وقارن الترجمات مع توثيق المرجع.'
      : `${bookTitle || 'البيبل'}${currentChapter ? ` — الإصحاح ${currentChapter}` : ''}: ${summary}`;
    updateBibleSeo({
      title: pageTitle,
      description: description.slice(0, 165),
      url: window.location.href,
      summary,
      bookTitle,
      chapter: currentChapter,
      verse: isModalOpen ? modalVerse : null
    });
  }, [view, currentBook, currentChapter, isModalOpen, modalVerse, books, currentScan]);

  // Auto-switch selected translations when navigating to a book if current selection is not available for that book
  useEffect(() => {
    if (!currentBook || !books.length) return;
    const bObj = books.find(b => b.code === currentBook);
    if (bObj && bObj.available_translations && bObj.available_translations.length > 0) {
      const avail = bObj.available_translations;
      setSelectedTranslations(prev => {
        const valid = prev.filter(slug => avail.includes(slug));
        if (valid.length > 0) return valid;
        return [avail[0]];
      });
    }
  }, [currentBook, books]);

  const openChapter = useCallback((book, chapter) => {
    const bObj = books.find(b => b.code === book);
    if (bObj && bObj.available_translations && bObj.available_translations.length > 0) {
      const avail = bObj.available_translations;
      setSelectedTranslations(prev => {
        const valid = prev.filter(slug => avail.includes(slug));
        if (valid.length > 0) return valid;
        return [avail[0]];
      });
    }
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setIsModalOpen(false);
    setView('chapter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [books]);

  const openVerseModal = useCallback((book, chapter, verse) => {
    const bObj = books.find(b => b.code === book);
    if (bObj && bObj.available_translations && bObj.available_translations.length > 0) {
      const avail = bObj.available_translations;
      setSelectedTranslations(prev => {
        const valid = prev.filter(slug => avail.includes(slug));
        if (valid.length > 0) return valid;
        return [avail[0]];
      });
    }
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setModalVerse(verse);
    setIsModalOpen(true);
  }, [books]);

  const handleQuickNavigate = useCallback((bookCode, ch, v) => {
    if (v) {
      setCurrentBook(bookCode);
      setCurrentChapter(ch);
      setModalVerse(v);
      setIsModalOpen(true);
      setView('chapter');
    } else {
      openChapter(bookCode, ch);
    }
  }, [openChapter]);

  const openScan = useCallback((slug, page, query = '') => {
    setIsModalOpen(false);
    setCurrentScan({ slug, page: page || 1, query: query || '' });
    setView('scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openCollection = useCallback((slug) => {
    setIsModalOpen(false);
    setCurrentCollection(slug);
    setView('collection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    setView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentBookObj = books.find(b => b.code === currentBook);
  const primarySlug = selectedTranslations[0] || 'ar-svd';

  return (
    <div className="min-h-screen bg-[#f6f1e7] dark:bg-[#0b1120] text-[#322010] dark:text-slate-100 font-scheherazade scheherazade-font bible-scope">
      
      {/* Top Bible Navigation Header */}
      <div className="sticky top-0 z-20 bg-[#fdfbf7]/95 dark:bg-[#111a2e]/95 backdrop-blur border-b border-[#ddcfb8] dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2.5 flex-wrap" dir="rtl">
          <button
            onClick={() => {
              setIsModalOpen(false);
              setView('landing');
            }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#8d6e47] dark:text-[#c2a578] hover:text-[#5c4127] transition-colors shrink-0"
            aria-label="العودة إلى واجهة البيبل"
            title="العودة إلى واجهة البيبل"
          >
            <BookOpen className="w-4 h-4" />
            <span>البيبل</span>
          </button>

          {/* Breadcrumb path */}
          {(view === 'chapter' || view === 'book') && currentBook && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-[#aa8e67]" />
              <button
                type="button"
                onClick={() => openCollection(currentBookObj?.collection_slug)}
                className="text-xs sm:text-sm font-bold text-[#5c4127] transition-colors hover:text-[#8d6e47] dark:text-slate-300"
                title="فتح مجموعة الأسفار"
              >
                {currentBookObj?.collection_name_ar || 'المجموعة'}
              </button>
              <ChevronLeft className="w-3.5 h-3.5 text-[#aa8e67]" />
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setView('book');
                }}
                className="text-xs sm:text-sm font-bold text-[#5c4127] dark:text-slate-300 hover:text-[#8d6e47] transition-colors"
              >
                {currentBookObj?.name_ar || currentBook}
              </button>
            </>
          )}

          {view === 'chapter' && currentChapter && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-[#aa8e67]" />
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setView('chapter');
                }}
                className="text-xs sm:text-sm font-bold text-[#5c4127] dark:text-slate-300 hover:text-[#8d6e47] transition-colors"
              >
                الإصحاح {currentChapter}
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Inline quick search */}
          {view !== 'landing' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const q = e.target.q.value.trim();
                if (q) handleSearch(q);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                name="q"
                type="search"
                placeholder="بحث..."
                className="w-28 sm:w-44 text-xs px-2.5 py-1.5 rounded-xl border border-[#ddcfb8] dark:border-slate-700 bg-white/80 dark:bg-[#152238] text-[#322010] dark:text-slate-100 focus:outline-none focus:border-[#8d6e47] font-medium"
                dir="rtl"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-[#8d6e47] hover:bg-[#735535] text-white transition-colors"
                title="بحث"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
        {view === 'landing' && (
          <BibleLanding
            translations={translations}
            books={books}
            searchTranslations={searchTranslations}
            searchCollections={searchCollections}
            onToggleSearchTranslation={handleToggleSearchTranslation}
            onToggleSearchCollection={handleToggleSearchCollection}
            onSelectAllSearchTranslations={handleSelectAllSearchTranslations}
            onSelectDefaultSearchTranslation={handleSelectDefaultSearchTranslation}
            onSearch={handleSearch}
            onQuickNavigate={handleQuickNavigate}
            onOpenChapter={openChapter}
            onOpenCollection={openCollection}
          />
        )}

        {view === 'search' && (
          <div dir="rtl">
            <div className="mb-6">
              <BibleSearchBox
                onSubmit={handleSearch}
                initialQuery={searchQuery}
                translations={translations}
                selectedTranslations={searchTranslations}
                selectedCollections={searchCollections}
                onToggleTranslation={handleToggleSearchTranslation}
                onToggleCollection={handleToggleSearchCollection}
                onSelectAllTranslations={handleSelectAllSearchTranslations}
                onSelectDefaultTranslation={handleSelectDefaultSearchTranslation}
              />
              <QuickNavigator books={books} onNavigate={handleQuickNavigate} />
            </div>
            <SearchResults
              query={searchQuery}
              selectedTranslations={searchTranslations}
              selectedCollections={searchCollections}
              translations={translations}
              onToggleTranslation={handleToggleSearchTranslation}
              onToggleCollection={handleToggleSearchCollection}
              onSelectAllTranslations={handleSelectAllSearchTranslations}
              onSelectDefaultTranslation={handleSelectDefaultSearchTranslation}
              onOpenVerse={openVerseModal}
              onBack={() => setView('landing')}
            />
          </div>
        )}

        {view === 'collection' && (
          <CollectionView
            collectionSlug={currentCollection}
            onOpenChapter={openChapter}
            onOpenScan={openScan}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'book' && (
          <BookView
            translation={primarySlug}
            book={currentBook}
            onOpenChapter={openChapter}
            onOpenScan={openScan}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'scan' && currentScan && (
          <ScanBookViewer
            slug={currentScan.slug}
            page={currentScan.page}
            query={currentScan.query}
            onNavigate={(page, query) => openScan(currentScan.slug, page, query)}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'chapter' && currentBook && currentChapter && (
          <ChapterReader
            selectedTranslations={selectedTranslations}
            onSwitchPrimary={handleSwitchPrimary}
            onToggleCheckbox={handleToggleCheckbox}
            book={currentBook}
            chapter={currentChapter}
            onOpenVerseModal={openVerseModal}
            onOpenCollection={openCollection}
            onNavigateChapter={(b, ch) => openChapter(b, ch)}
            onOpenScan={openScan}
            translations={translations}
          />
        )}
      </div>

      {/* Elegant Single Verse Focus Modal */}
      {isModalOpen && currentBook && currentChapter && (
        <VerseFocusModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          book={currentBook}
          chapter={currentChapter}
          verse={modalVerse}
          selectedTranslations={selectedTranslations}
          onSwitchPrimary={handleSwitchPrimary}
          onToggleCheckbox={handleToggleCheckbox}
          translations={translations}
          onNavigateVerse={(b, ch, v) => {
            setCurrentBook(b);
            setCurrentChapter(ch);
            setModalVerse(v);
          }}
        />
      )}

    </div>
  );
}
