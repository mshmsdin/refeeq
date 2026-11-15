import React, { useEffect, useState } from 'react';
import { Wallet, Pencil, Trash2, Copy, Clock, RefreshCw, BookOpen, Share2, X } from 'lucide-react';
import { buildBibleWalletUrl } from '../utils/urlRoutes';

const buttonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#ddcfb8] bg-white px-3 py-2 text-sm font-bold text-[#5c4127] transition hover:bg-[#efe8dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50 dark:border-slate-700 dark:bg-[#152238] dark:text-slate-100 dark:hover:bg-slate-800';
const inputClass = 'min-h-[44px] w-full rounded-xl border border-[#ddcfb8] bg-white px-3 py-2 text-sm text-[#322010] focus:outline-none focus:ring-2 focus:ring-amber-600 dark:border-slate-600 dark:bg-[#111a2e] dark:text-slate-100';

export function BibleWalletControls({ wallet, onOpen, onAdd, canAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [addError, setAddError] = useState('');
  const submit = async event => {
    event.preventDefault(); setAddError('');
    const result = await onAdd(label.trim());
    if (result) { setShowAdd(false); setLabel(''); }
    else setAddError('تعذر الإضافة؛ راجع رسالة الخطأ وحاول مرة أخرى.');
  };
  return <>
    <div className="flex shrink-0 items-center gap-1.5" dir="rtl">
    <button type="button" onClick={() => { setLabel(''); setAddError(''); setShowAdd(true); }} disabled={!canAdd || wallet.busy}
      className="group inline-flex h-11 w-10 items-center justify-center rounded-xl text-[#8d6e47] transition-colors hover:bg-[#efe8dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-40 dark:text-[#d5be98] dark:hover:bg-slate-800"
      title="إضافة النص المفتوح مع الترجمات إلى المحفظة" aria-label="إضافة النص المفتوح إلى المحفظة">
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-8 w-8 overflow-visible transition-transform duration-200 ease-out motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-x-1 motion-safe:group-focus-visible:-translate-y-1 group-disabled:transform-none">
        <g transform="translate(64 0) scale(-1 1)">
          <path d="M12 59C0 36 7 20 29 11L25 3 59 6 44 33 39 22C20 30 10 43 12 59Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 49C9 32 18 21 35 15L32 9 52 10 40 19C25 24 16 35 12 49Z" fill="white" opacity=".2" />
        </g>
      </svg>
    </button>
    <button type="button" onClick={onOpen} className={`${buttonClass} relative h-11 w-11 !p-0`} title="المحفظة" aria-label={`المحفظة، ${wallet.count} عنصر`}>
      <Wallet className="h-5 w-5" />
      <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8d6e47] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fdfbf7] dark:ring-[#111a2e]">{wallet.count.toLocaleString('ar')}</span>
    </button>
    </div>
    {showAdd && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowAdd(false); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="wallet-add-title" onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-[#ddcfb8] bg-[#fdfbf7] p-5 shadow-2xl dark:border-slate-700 dark:bg-[#111a2e]" dir="rtl">
        <div><h2 id="wallet-add-title" className="text-xl font-black">تسمية العنصر</h2><p className="mt-1 text-sm text-[#735535] dark:text-slate-300">اكتب تسمية تظهر بجانب النص في المحفظة.</p></div>
        <label className="block text-sm font-bold">التسمية
          <input autoFocus required maxLength={200} value={label} onChange={event => setLabel(event.target.value)} className={inputClass} placeholder="مثال: مقارنة الإصحاح الأول" />
        </label>
        {addError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{addError}</p>}
        <div className="flex flex-wrap gap-2"><button type="submit" className={buttonClass} disabled={wallet.busy || !label.trim()}>إضافة إلى المحفظة</button><button type="button" className={buttonClass} disabled={wallet.busy} onClick={() => setShowAdd(false)}>إلغاء</button></div>
      </form>
    </div>}
  </>;
}

function WalletRow({ item, index, count, editable, busy, onOpen, onUpdate, onDelete }) {
  const [edit, setEdit] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const save = async event => {
    event.preventDefault(); setError('');
    const position = Number(value);
    if (edit === 'position' && (!Number.isInteger(position) || position < 1 || position > count)) { setError(`اختر رقماً بين ١ و${count.toLocaleString('ar')}.`); return; }
    if (edit === 'label' && !value.trim()) { setError('اكتب تسمية للعنصر.'); return; }
    const result = await onUpdate(item.id, edit === 'label' ? {label:value.trim()} : {position});
    if (result) setEdit('');
  };
  return <li className="border-b border-[#ddcfb8]/70 p-3 last:border-0 sm:p-4 dark:border-slate-700">
    <div className="flex items-start gap-2.5 sm:gap-4">
      <div className="flex shrink-0 items-center gap-1">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#efe8dc] font-bold dark:bg-slate-800">{(index + 1).toLocaleString('ar')}</span>
        {editable && <button type="button" className="flex h-11 w-9 items-center justify-center rounded-lg hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:bg-slate-700" disabled={busy}
          aria-label={`تغيير ترتيب العنصر ${index + 1}`} title="تغيير الرقم الترتيبي"
          onClick={() => { setEdit('position'); setValue(String(index + 1)); setError(''); }}><Pencil className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="break-words text-right text-base font-bold text-[#735535] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-200" onClick={() => onOpen(item.snapshot)}>{item.label}</button>
          {editable && <button type="button" className="flex h-11 w-9 items-center justify-center rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700" disabled={busy}
            aria-label={`تعديل تسمية ${item.label}`} onClick={() => { setEdit('label'); setValue(item.label); setError(''); }}><Pencil className="h-3.5 w-3.5" /></button>}
        </div>
        <p className="mt-1 break-words text-sm leading-relaxed text-[#5c4127] dark:text-slate-300">{item.excerpt}{item.excerpt.length >= 220 ? '…' : ''}</p>
        <p className="mt-2 text-xs text-[#8d6e47] dark:text-slate-400">{item.bookName}{item.snapshot.chapter ? ` — الإصحاح ${item.snapshot.chapter}` : ' — السفر كاملاً'}{item.snapshot.verse ? ` — العدد ${item.snapshot.verse}` : ''}{item.snapshot.translations.length > 1 ? ` · مقارنة ${item.snapshot.translations.length.toLocaleString('ar')} ترجمات` : ''}</p>
      </div>
      {editable && <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950" disabled={busy}
        aria-label={`حذف ${item.label}`} onClick={() => { if (window.confirm(`هل تريد حذف «${item.label}» من المحفظة؟`)) onDelete(item.id); }}><Trash2 className="h-4 w-4" /></button>}
    </div>
    {edit && editable && <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="min-w-40 flex-1 text-sm">{edit === 'position' ? 'الرقم الجديد' : 'تسمية العنصر'}
        <input autoFocus aria-label={edit === 'position' ? 'الرقم الجديد' : 'تسمية العنصر'} className={inputClass} value={value} onChange={e => setValue(e.target.value)}
          type={edit === 'position' ? 'number' : 'text'} min={edit === 'position' ? 1 : undefined} max={edit === 'position' ? count : undefined} maxLength={200} required />
      </label>
      <button className={buttonClass} type="submit" disabled={busy}>حفظ</button>
      <button className={buttonClass} type="button" onClick={() => setEdit('')}>إلغاء</button>
      {error && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">{error}</p>}
    </form>}
  </li>;
}

export default function BibleWallet({ wallet, onOpenItem, onBack, onDeleted }) {
  const { data, busy, error, expired } = wallet;
  const [clock, setClock] = useState(Date.now());
  const [showLinks, setShowLinks] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = data ? Math.max(0, data.expiresAt - clock - wallet.offset) : 0;
  const editable = Boolean(data?.isEditor && !expired);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const copy = async token => {
    try { await navigator.clipboard.writeText(new URL(buildBibleWalletUrl(token), window.location.origin).href); wallet.setMessage('نُسخ الرابط.'); }
    catch { wallet.setMessage('تعذر النسخ التلقائي؛ يمكنك تحديد الرابط ونسخه من الحقل.'); }
  };
  return <section dir="rtl" className="space-y-5" aria-label="المحفظة المؤقتة">
    <div className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto">
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap"><h1 className="flex shrink-0 items-center gap-2 text-2xl font-black"><Wallet className="h-6 w-6 text-[#8d6e47]" />المحفظة</h1>
        <span className="whitespace-nowrap text-sm text-[#735535] dark:text-slate-400">{data ? editable ? 'رابط التحرير · يمكنك تنظيم العناصر.' : 'رابط مشاهدة · قراءة العناصر وفتحها فقط.' : 'اجمع النصوص والمقارنات في رابط مؤقت قابل للمشاركة.'}</span></div>
      <button type="button" className={`${buttonClass} shrink-0 whitespace-nowrap`} onClick={onBack}><BookOpen className="h-4 w-4" />العودة إلى القراءة</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}
      <button type="button" className={`${buttonClass} ms-3`} disabled={busy} onClick={wallet.reload}>إعادة المحاولة</button></div>}
    {busy && !data && <p role="status" className="p-5 text-center">جارٍ فتح المحفظة…</p>}
    {expired && <p role="alert" className="rounded-xl bg-amber-100 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-200">انتهت مدة المحفظة. ارجع إلى القراءة وأضف نصاً لإنشاء محفظة جديدة.</p>}
    {data && !expired && <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ddcfb8] bg-[#fdfbf7] p-3 sm:p-4 dark:border-slate-700 dark:bg-[#111a2e]">
        <p className="me-auto flex items-center gap-2 whitespace-nowrap text-sm"><Clock className="h-4 w-4" />المتبقي: {hours.toLocaleString('ar')} ساعة و{minutes.toLocaleString('ar')} دقيقة</p>
        {editable && <>
          <button type="button" className={`${buttonClass} whitespace-nowrap`} disabled={busy} onClick={wallet.extend}>تمديد ٢٤ ساعة</button>
          <button type="button" className={`${buttonClass} h-11 w-11 !p-0 text-red-700 dark:text-red-300`} disabled={busy} onClick={async () => { if (window.confirm('هل تريد حذف المحفظة؟')) { const result = await wallet.remove(); if (result) onDeleted(); } }} aria-label="حذف المحفظة" title="حذف المحفظة"><Trash2 className="h-4 w-4" /></button>
          <button type="button" className={`${buttonClass} h-11 w-11 !p-0`} onClick={() => setShowLinks(true)} aria-label="مشاركة روابط المحفظة" title="إظهار رابطَي المحفظة"><Share2 className="h-5 w-5" /></button>
        </>}
      </div>
      {data.items.length ? <ol className="overflow-hidden rounded-2xl border border-[#ddcfb8] bg-white dark:border-slate-700 dark:bg-[#111a2e]">
        {data.items.map((item, index) => <WalletRow key={item.id} item={item} index={index} count={data.items.length} editable={editable} busy={busy} onOpen={onOpenItem} onUpdate={wallet.update} onDelete={wallet.removeItem} />)}
      </ol> : <p className="rounded-2xl border border-dashed border-[#ddcfb8] p-8 text-center">المحفظة فارغة. افتح نصاً وأضفه بالسهم المجاور لزر المحفظة.</p>}
    </>}
    {showLinks && editable && data && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowLinks(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="wallet-links-title" className="w-full max-w-2xl space-y-4 rounded-2xl border border-[#ddcfb8] bg-[#fdfbf7] p-5 shadow-2xl dark:border-slate-700 dark:bg-[#111a2e]">
        <div className="flex items-center justify-between gap-3"><h2 id="wallet-links-title" className="text-xl font-black">روابط المحفظة</h2><button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[#efe8dc] focus-visible:ring-2 focus-visible:ring-amber-600 dark:hover:bg-slate-800" onClick={() => setShowLinks(false)} aria-label="إغلاق"><X className="h-5 w-5" /></button></div>
        <p className="text-sm text-[#735535] dark:text-slate-300">رابط التحرير للتنظيم والتعديل، ورابط المشاهدة للمشاركة والقراءة فقط.</p>
        {[[data.editToken, 'رابط التحرير'], [data.viewToken, 'رابط المشاهدة']].map(([token, title]) => <div key={title} className="flex min-w-0 items-center gap-2">
          <label className="min-w-0 flex-1 text-sm font-bold">{title}<input readOnly dir="ltr" className={inputClass} value={new URL(buildBibleWalletUrl(token), window.location.origin).href} onFocus={e => e.target.select()} /></label>
          <button type="button" className={`${buttonClass} h-11 w-11 !p-0`} onClick={() => copy(token)} aria-label={`نسخ ${title}`}><Copy className="h-4 w-4" /></button>
        </div>)}
        <button type="button" className={`${buttonClass} whitespace-nowrap`} disabled={busy} onClick={() => { if (window.confirm('هل تريد تغيير رابطَي التحرير والمشاهدة؟ سيتوقف الرابطان القديمان فوراً.')) wallet.rotate(); }}><RefreshCw className="h-4 w-4" />تغيير الروابط</button>
      </section>
    </div>}
    {!data && !busy && !error && <p className="rounded-2xl border border-dashed border-[#ddcfb8] p-8 text-center leading-loose">افتح سفراً أو إصحاحاً أو عدداً، ثم انقر السهم بجانب «المحفظة».<br />تبدأ المحفظة بمدة ٤٨ ساعة عند أول إضافة، وتحفظ النص مع الترجمات المختارة.</p>}
  </section>;
}
