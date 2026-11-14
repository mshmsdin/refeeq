/**
 * جدول اعتماد الأسفار: كل سفر منشور وحالته عند التقاليد اليهودية والمسيحية، مع الإحصاء والمصادر ودرجة الثقة.
 * البيانات من /api/bible/canon؛ لا يُحكم هنا لاهوتياً، بل يُبيَّن ما أعلنه كل تقليد أو توثقه الدراسات.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ExternalLink, Search } from 'lucide-react';

const GROUPS = [
  { key: 'jewish', label: 'اليهود' },
  { key: 'christian', label: 'النصارى' }
];

const STATUS_STYLE = {
  canon: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700',
  canon2: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900/40 dark:text-teal-100 dark:border-teal-700',
  read: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700',
  appendix: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800',
  disputed: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-700',
  oral: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-700',
  tradition: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-100 dark:border-cyan-700',
  attested: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-900/40 dark:text-sky-100 dark:border-sky-700',
  absent: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  witness: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/40 dark:text-violet-100 dark:border-violet-700',
  not: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
  unknown: 'bg-slate-200 text-slate-800 border-slate-400 border-dashed dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500'
};

const CONFIDENCE_MARK = { high: '', medium: '≈', low: '؟' };

function StatusBadge({ cell, statuses, compact = false }) {
  const status = statuses[cell.s];
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-lg border px-1.5 py-0.5 text-[11px] font-bold leading-5 ${STATUS_STYLE[cell.s] || ''}`}
      title={[status.label_ar, cell.n].filter(Boolean).join(' — ')}
    >
      {compact ? status.label_ar : status.label_ar}
      {CONFIDENCE_MARK[cell.c] && <span className="text-[10px] opacity-80" aria-label={cell.c === 'low' ? 'ثقة منخفضة' : 'ثقة متوسطة'}>{CONFIDENCE_MARK[cell.c]}</span>}
    </span>
  );
}

function TraditionCard({ tradition, stats }) {
  const [open, setOpen] = useState(false);
  const counts = stats?.counts || {};
  return (
    <div className="rounded-2xl border border-[#ddcfb8] bg-white/80 dark:border-slate-700 dark:bg-[#152238]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-right"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-black text-[#322010] dark:text-slate-100">{tradition.name_ar}</span>
          <span className="block text-[11px] text-[#735535] dark:text-slate-400">{tradition.canon_size_ar}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-[#5c4127] dark:text-slate-300">
          <span>{stats ? `${stats.accepted} معتمد` : ''}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-[#ddcfb8]/70 px-3 py-2.5 text-xs leading-6 text-[#5c4127] dark:border-slate-700 dark:text-slate-300">
          {tradition.includes_ar && <p className="font-bold">يشمل: {tradition.includes_ar}</p>}
          <p>{tradition.summary_ar}</p>
          <p className="text-[11px] text-[#735535] dark:text-slate-400">
            {Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join(' · ')}
          </p>
          <ul className="space-y-0.5">
            {tradition.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2 dark:text-blue-300">
                  {source.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CanonTable({ onBack, onOpenBook }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('group') === 'jewish' ? 'jewish' : 'christian'; } catch { return 'christian'; }
  });
  const [collection, setCollection] = useState('all');
  const [query, setQuery] = useState('');
  const [onlyTradition, setOnlyTradition] = useState('');
  const [onlyStatus, setOnlyStatus] = useState('accepted');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/bible/canon')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { if (d.success) setData(d); else setError(d.error || 'تعذر تحميل الجدول.'); } })
      .catch(() => { if (!cancelled) setError('تعذر الاتصال بالخادم.'); });
    return () => { cancelled = true; };
  }, []);

  const traditions = useMemo(() => (data ? data.traditions.filter((t) => t.group === group) : []), [data, group]);

  const collections = useMemo(() => {
    if (!data) return [];
    const seen = new Map();
    for (const row of data.rows) if (!seen.has(row.collection_slug)) seen.set(row.collection_slug, row.collection_name_ar);
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows.filter((row) => {
      // المصادر اليهودية (المشنا والتلمودان...) لا معنى لها في جدول الكنائس.
      if (group === 'christian' && row.collection_slug === 'jewish-sources') return false;
      if (collection !== 'all' && row.collection_slug !== collection) return false;
      if (q && !`${row.name_ar} ${row.name_en} ${row.code}`.toLowerCase().includes(q)) return false;
      if (onlyTradition) {
        const cell = row.cells[onlyTradition];
        if (onlyStatus === 'accepted' && !['canon', 'canon2'].includes(cell.s)) return false;
        if (onlyStatus === 'any-positive' && !['canon', 'canon2', 'read', 'appendix', 'disputed', 'attested'].includes(cell.s)) return false;
        if (onlyStatus === 'not' && cell.s !== 'not') return false;
      }
      return true;
    });
  }, [data, group, collection, query, onlyTradition, onlyStatus]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.collection_slug)) map.set(row.collection_slug, { name: row.collection_name_ar, rows: [] });
      map.get(row.collection_slug).rows.push(row);
    }
    return [...map.entries()];
  }, [rows]);

  if (error) return <div dir="rtl" className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-sm font-bold text-red-800">{error}</div>;
  if (!data) return <div dir="rtl" className="py-16 text-center text-sm text-[#735535] dark:text-slate-400">جارٍ تحميل جدول الاعتماد…</div>;

  const { stats, statuses, confidence } = data;
  const groupCount = (key) => data.traditions.filter((t) => t.group === key).length;
  const th = 'border-b border-[#ddcfb8] bg-[#fdfbf7] px-2 py-2 text-center text-[11px] font-black text-[#5c4127] dark:border-slate-700 dark:bg-[#111a2e] dark:text-slate-200';

  return (
    <div dir="rtl" className="animate-fadeIn font-scheherazade">
      <div className="mb-3 flex items-start gap-3 border-b border-[#ddcfb8] pb-3 dark:border-slate-800">
        <button type="button" onClick={onBack} className="rounded-xl border border-[#ddcfb8] bg-white p-2 text-[#735535] transition-colors hover:bg-[#efe8dc] dark:border-slate-700 dark:bg-[#152238]" aria-label="رجوع">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-[#322010] dark:text-slate-100 sm:text-2xl">جدول اعتماد الأسفار</h1>
          <p className="text-xs leading-6 text-[#735535] dark:text-slate-400">
            كل سفر منشور عندنا، ومن يعتمده من التقاليد اليهودية والمسيحية. نبيّن ما أعلنه كل تقليد أو ما توثقه الدراسات، ولا نحكم لاهوتياً.
          </p>
        </div>
      </div>

      {/* إحصاء */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['الأسفار المنشورة', stats.total_works, [
            stats.total_witnesses ? `و${stats.total_witnesses} شاهداً نصياً` : '',
            stats.total_jewish_sources ? `و${stats.total_jewish_sources} من المصادر اليهودية` : ''
          ].filter(Boolean).join(' ') || 'أسفار ونصوص منشورة'],
          ['يعتمدها تقليد يهودي واحد على الأقل', stats.works_accepted_by_any_jewish, 'من التناخ وحده تقريباً'],
          ['يعتمدها تقليد مسيحي واحد على الأقل', stats.works_accepted_by_any_christian, `${stats.works_accepted_by_all_christian} منها عند كل الكنائس المذكورة`],
          ['لا يعتمدها أي تقليد هنا', stats.works_accepted_by_no_tradition, `و${stats.works_accepted_by_one_tradition} عند تقليد واحد فقط`]
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-[#ddcfb8] bg-white/80 p-3 text-center dark:border-slate-700 dark:bg-[#152238]">
            <div className="text-2xl font-black text-[#8d6e47] dark:text-[#c2a578]">{value}</div>
            <div className="text-xs font-bold text-[#322010] dark:text-slate-100">{label}</div>
            <div className="text-[11px] text-[#735535] dark:text-slate-400">{hint}</div>
          </div>
        ))}
      </div>

      {/* المفتاح */}
      <details className="mb-4 rounded-2xl border border-[#ddcfb8] bg-white/70 p-3 text-xs dark:border-slate-700 dark:bg-[#152238]">
        <summary className="cursor-pointer font-black text-[#322010] dark:text-slate-100">مفتاح الألوان والثقة</summary>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {Object.entries(statuses).map(([key, status]) => (
            <li key={key} className="flex items-start gap-2 leading-6 text-[#5c4127] dark:text-slate-300">
              <span className={`mt-0.5 shrink-0 rounded-lg border px-1.5 text-[11px] font-bold ${STATUS_STYLE[key]}`}>{status.label_ar}</span>
              <span>{status.description_ar}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 leading-6 text-[#5c4127] dark:text-slate-300">
          الثقة: بلا علامة = {confidence.high}. «≈» = {confidence.medium}. «؟» = {confidence.low}.
        </p>
      </details>

      {/* التبويبات */}
      <div className="mb-3 flex gap-2" role="tablist" aria-label="التقاليد">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            onClick={() => { setGroup(g.key); setOnlyTradition(''); setExpanded(null); }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-black transition-colors ${group === g.key ? 'border-[#8d6e47] bg-[#8d6e47] text-white' : 'border-[#ddcfb8] bg-white text-[#5c4127] hover:bg-[#efe8dc] dark:border-slate-700 dark:bg-[#152238] dark:text-slate-200'}`}
          >
            {g.label} <span className="text-xs font-bold opacity-80">({groupCount(g.key)} تقاليد)</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {traditions.map((t) => <TraditionCard key={t.slug} tradition={t} stats={stats.by_tradition[t.slug]} />)}
      </div>

      {/* المرشحات */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aa8e67]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم السفر…"
            className="w-full rounded-xl border border-[#ddcfb8] bg-white py-2 pl-3 pr-8 text-sm dark:border-slate-700 dark:bg-[#152238]"
            aria-label="البحث في الأسفار"
          />
        </div>
        <select value={collection} onChange={(e) => setCollection(e.target.value)} className="rounded-xl border border-[#ddcfb8] bg-white px-2 py-2 text-xs font-bold dark:border-slate-700 dark:bg-[#152238]" aria-label="المجموعة">
          <option value="all">كل المجموعات</option>
          {collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={onlyTradition} onChange={(e) => setOnlyTradition(e.target.value)} className="rounded-xl border border-[#ddcfb8] bg-white px-2 py-2 text-xs font-bold dark:border-slate-700 dark:bg-[#152238]" aria-label="التقليد">
          <option value="">كل التقاليد</option>
          {traditions.map((t) => <option key={t.slug} value={t.slug}>{t.short_ar}</option>)}
        </select>
        {onlyTradition && (
          <select value={onlyStatus} onChange={(e) => setOnlyStatus(e.target.value)} className="rounded-xl border border-[#ddcfb8] bg-white px-2 py-2 text-xs font-bold dark:border-slate-700 dark:bg-[#152238]" aria-label="الحالة">
            <option value="accepted">يعتمدها (قانوني)</option>
            <option value="any-positive">لها مكانة أي كانت</option>
            <option value="not">لا يعتمدها</option>
          </select>
        )}
        <span className="text-xs font-bold text-[#735535] dark:text-slate-400">{rows.length} سفراً</span>
      </div>

      {/* الجدول */}
      <div className="overflow-x-auto rounded-2xl border border-[#ddcfb8] bg-white dark:border-slate-700 dark:bg-[#0f1a2e]">
        <table className="w-full min-w-[640px] border-collapse text-right">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${th} sticky right-0 z-20 min-w-[170px] text-right`} scope="col">السفر</th>
              {traditions.map((t) => (
                <th key={t.slug} className={th} scope="col" title={t.includes_ar}>{t.short_ar}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([slug, section]) => (
              <React.Fragment key={slug}>
                <tr>
                  <td colSpan={traditions.length + 1} className="bg-[#efe8dc] px-3 py-1.5 text-xs font-black text-[#5c4127] dark:bg-slate-800 dark:text-slate-200">
                    {section.name} <span className="font-bold opacity-70">({section.rows.length})</span>
                  </td>
                </tr>
                {section.rows.map((row) => {
                  const isOpen = expanded === row.code;
                  return (
                    <React.Fragment key={row.code}>
                      <tr className="border-b border-[#efe8dc] hover:bg-[#fdfbf7] dark:border-slate-800 dark:hover:bg-slate-800/50">
                        <th scope="row" className="sticky right-0 z-[1] bg-white px-3 py-1.5 text-right text-xs font-bold text-[#322010] dark:bg-[#0f1a2e] dark:text-slate-100">
                          <button type="button" onClick={() => setExpanded(isOpen ? null : row.code)} className="flex w-full items-center gap-1 text-right" aria-expanded={isOpen}>
                            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#aa8e67] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            <span>{row.name_ar}</span>
                          </button>
                        </th>
                        {traditions.map((t) => (
                          <td key={t.slug} className="px-1.5 py-1 text-center">
                            <StatusBadge cell={row.cells[t.slug]} statuses={statuses} />
                          </td>
                        ))}
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#fdfbf7] dark:bg-[#111a2e]">
                          <td colSpan={traditions.length + 1} className="px-3 py-3 text-xs leading-6 text-[#5c4127] dark:text-slate-300">
                            <div className="mb-1 flex flex-wrap items-center gap-2 font-black text-[#322010] dark:text-slate-100">
                              <span>{row.name_ar}</span>
                              <span className="font-mono text-[11px] font-bold text-[#8d6e47]">{row.code}</span>
                              {onOpenBook && (
                                <button type="button" onClick={() => onOpenBook(row.code)} className="rounded-lg border border-[#ddcfb8] px-2 py-0.5 text-[11px] font-bold hover:bg-[#efe8dc] dark:border-slate-700 dark:hover:bg-slate-800">
                                  فتح السفر
                                </button>
                              )}
                            </div>
                            <ul className="space-y-1">
                              {traditions.map((t) => {
                                const cell = row.cells[t.slug];
                                return (
                                  <li key={t.slug} className="flex flex-wrap items-baseline gap-2">
                                    <span className="w-44 shrink-0 font-bold">{t.name_ar}</span>
                                    <StatusBadge cell={cell} statuses={statuses} />
                                    {cell.n && <span>{cell.n}</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
            {!rows.length && (
              <tr><td colSpan={traditions.length + 1} className="px-3 py-8 text-center text-sm text-[#735535] dark:text-slate-400">لا توجد أسفار بهذه المرشحات.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-6 text-[#735535] dark:text-slate-400">
        الجدول يعتمد على قرارات التقاليد المعلنة وعلى دراسات منشورة، وبعض التقاليد (كالأرمنية والسريانية وبيت إسرائيل) لا تحسم مصادرها كل الأسفار؛ فتُعرض هذه الخلايا بعلامة «≈» أو «؟» أو «غير محسوم». النص الكامل للتقاليد ومراجعها في بطاقاتها أعلاه.
      </p>
    </div>
  );
}
