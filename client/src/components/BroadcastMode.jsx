import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, FolderTree, Image as ImageIcon, LoaderCircle, MonitorPlay, X } from 'lucide-react';
import { imageUrl as buildImageUrl } from '../utils/apiUrls';

const isImageFile = value => typeof value === 'string' && /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(value);

function flattenFolders(nodes, depth = 0, result = []) {
  for (const node of nodes || []) {
    result.push({ ...node, depth });
    flattenFolders(node.children, depth + 1, result);
  }
  return result;
}

export default function BroadcastMode({ sectsList = [], initialSect = 'all', onExit, onOpenDocument }) {
  const [sect, setSect] = useState(initialSect || 'all');
  const [folderId, setFolderId] = useState('');
  const [folderTree, setFolderTree] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const folders = useMemo(() => flattenFolders(folderTree), [folderTree]);
  const selectedFolder = folders.find(folder => String(folder.id) === folderId);
  const selectedSect = sectsList.find(item => item.sect === sect);

  useEffect(() => {
    const controller = new AbortController();
    setFolderTree([]);
    setFolderId('');
    const query = sect !== 'all' ? `?sect=${encodeURIComponent(sect)}` : '';
    fetch(`/api/tree${query}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('تعذر تحميل قائمة الموضوعات');
        return response.json();
      })
      .then(data => setFolderTree(data.success && Array.isArray(data.tree) ? data.tree : []))
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError('تعذر تحميل قائمة الموضوعات. أعد المحاولة.');
      });
    return () => controller.abort();
  }, [sect]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '24' });
    if (sect !== 'all') params.set('sect', sect);
    if (folderId) params.set('folder_id', folderId);
    fetch(`/api/documents?${params.toString()}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('تعذر تحميل المواد');
        return response.json();
      })
      .then(data => {
        if (!data.success) throw new Error('تعذر تحميل المواد');
        setDocuments(data.documents || []);
        setTotal(data.total || 0);
        setIsLoading(false);
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') {
          setError('تعذر تحميل المواد. تحقق من الاتصال ثم أعد المحاولة.');
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, [sect, folderId, page]);

  const changeSect = value => {
    setSect(value);
    setPage(1);
  };

  const changeFolder = value => {
    setFolderId(value);
    setPage(1);
  };

  return (
    <main dir="rtl" className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <button onClick={onExit} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" aria-label="العودة إلى الأرشيف">
          <ArrowRight className="h-4 w-4" />
          <span className="hidden sm:inline">الأرشيف</span>
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950"><MonitorPlay className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-black sm:text-base">وضع البث</h1>
          <p className="truncate text-[11px] text-slate-600 dark:text-slate-300">اختر القسم والموضوع لعرض مواده فقط</p>
        </div>
        <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-slate-300 dark:hover:bg-slate-800" title="إغلاق وضع البث" aria-label="إغلاق وضع البث"><X className="h-5 w-5" /></button>
      </header>

      <section className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end sm:px-6">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
          القسم
          <select value={sect} onChange={event => changeSect(event.target.value)} className="min-h-11 rounded-xl border border-slate-400 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100">
            <option value="all">الكل</option>
            {sectsList.filter(item => item.sect !== 'all').map(item => <option key={item.sect} value={item.sect}>{item.name || item.sect}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
          الموضوع / المجلد
          <select value={folderId} onChange={event => changeFolder(event.target.value)} className="min-h-11 rounded-xl border border-slate-400 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100">
            <option value="">{sect === 'all' ? 'كل الموضوعات في جميع الأقسام' : `كل موضوعات ${selectedSect?.name || sect}`}</option>
            {folders.map(folder => <option key={folder.id} value={folder.id}>{'　'.repeat(Math.min(folder.depth, 5))}{folder.name}</option>)}
          </select>
        </label>
        <div className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 sm:px-2">
          <FolderTree className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>{selectedFolder?.name || selectedSect?.name || 'جميع الأقسام'}</span>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black">المواد المتاحة للبث</h2>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{total.toLocaleString('ar-EG')} مادة</span>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><LoaderCircle className="h-5 w-5 animate-spin text-amber-600" /> جارٍ تحميل المواد...</div>
        ) : !error && documents.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-400 text-center text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"><ImageIcon className="h-8 w-8 text-slate-500" /><p className="font-bold">لا توجد مواد في هذا الاختيار</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {documents.map(doc => {
              const images = (doc.images || []).filter(isImageFile);
              const cover = images[0] || (isImageFile(doc.relative_path) ? doc.relative_path : '');
              return (
                <button key={doc.id} onClick={() => onOpenDocument(doc)} className="group overflow-hidden rounded-2xl border border-slate-300 bg-white text-start shadow-sm transition hover:border-amber-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-700 dark:bg-slate-900">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {cover ? <img src={buildImageUrl(cover)} alt="" loading="lazy" className="h-full w-full object-contain transition-transform group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-8 w-8 text-slate-600 dark:text-slate-300" /></div>}
                    {images.length > 1 && <span className="absolute bottom-2 left-2 rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-bold text-white">{images.length} صور</span>}
                  </div>
                  <span className="line-clamp-2 block min-h-12 p-3 text-xs font-bold leading-5 text-slate-800 dark:text-slate-100">{doc.filename}</span>
                </button>
              );
            })}
          </div>
        )}

        {!error && total > 24 && <nav aria-label="صفحات مواد البث" className="mt-6 flex items-center justify-center gap-3">
          <button disabled={page <= 1 || isLoading} onClick={() => setPage(value => Math.max(1, value - 1))} className="flex min-h-10 items-center gap-1 rounded-xl border border-slate-400 bg-white px-3 text-xs font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:text-slate-500"><ChevronRight className="h-4 w-4" /> السابق</button>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{page.toLocaleString('ar-EG')}</span>
          <button disabled={page * 24 >= total || isLoading} onClick={() => setPage(value => value + 1)} className="flex min-h-10 items-center gap-1 rounded-xl border border-slate-400 bg-white px-3 text-xs font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:text-slate-500">التالي <ChevronLeft className="h-4 w-4" /></button>
        </nav>}
      </section>
    </main>
  );
}
