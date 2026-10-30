import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2, X, Copy, Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { imageUrl as buildImageUrl } from '../utils/apiUrls';

const isImageFile = value => typeof value === 'string' && /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(value);

export default function ProjectorView({ doc, onClose, onCopyImage, copiedDocId }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const images = useMemo(() => {
    const listed = (doc?.images || []).filter(isImageFile);
    if (listed.length) return listed;
    const fallback = [doc?.relative_path, doc?.full_path, doc?.filename].find(isImageFile);
    return fallback ? [fallback] : [];
  }, [doc]);
  const hasImage = images.length > 0;
  const activeImage = images[activeImageIndex] || images[0];
  const isCopied = copiedDocId === doc?.id;
  const cleanText = (doc?.ocr_text || '').replace(/!\[.*?\]\(.*?\)/g, '').trim();

  useEffect(() => setActiveImageIndex(0), [doc?.id]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
      if (images.length > 1 && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        setActiveImageIndex(index => Math.min(Math.max(index + (event.key === 'ArrowRight' ? -1 : 1), 0), images.length - 1));
        return;
      }
      if (event.key === 'f' || event.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
          document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  if (!doc) return null;

  const selectImage = index => setActiveImageIndex(Math.min(Math.max(index, 0), images.length - 1));
  const stepImage = step => selectImage(activeImageIndex + step);
  const copyCurrentImage = () => onCopyImage({ ...doc, images: activeImage ? [activeImage] : doc.images });

  return (
    <div dir="ltr" className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-950 text-slate-100 sm:flex-row">
      {/* Image previews remain attached to this topic; arrows never change documents. */}
      {images.length > 1 && (
        <aside aria-label="صور الموضوع" className="order-2 flex max-h-24 shrink-0 gap-2 overflow-x-auto border-t border-slate-700 bg-slate-900 p-2 sm:order-1 sm:max-h-none sm:h-full sm:w-24 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-t-0 sm:border-r sm:border-slate-700 sm:p-2">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => selectImage(index)}
              aria-label={`عرض الصورة ${index + 1} من ${images.length}`}
              aria-pressed={activeImageIndex === index}
              className={`relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-24 sm:w-full ${activeImageIndex === index ? 'border-amber-400' : 'border-slate-600 hover:border-slate-300'}`}
            >
              <img src={buildImageUrl(image)} alt="" loading="lazy" className="h-full w-full object-contain" />
              <span className="absolute bottom-1 right-1 rounded bg-slate-950 px-1.5 text-[10px] font-bold text-white">{index + 1}</span>
            </button>
          ))}
        </aside>
      )}

      <section className="relative order-1 flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black sm:order-2" dir="rtl">
        <div className="absolute right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/90 p-1.5 shadow-lg sm:right-5 sm:top-5">
          <div className="min-w-0 px-2 text-right">
            <h2 className="max-w-[45vw] truncate text-xs font-bold text-white sm:max-w-md sm:text-sm">{doc.filename}</h2>
            <p className="max-w-[45vw] truncate text-[10px] text-slate-300 sm:max-w-md">{doc.folder_name || doc.sect || ''}</p>
          </div>
          {hasImage && <button onClick={copyCurrentImage} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-2 text-xs font-bold text-white hover:bg-amber-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" title="نسخ الصورة الحالية">
            {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">نسخ الصورة</span>
          </button>}
          <button onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
            else document.exitFullscreen?.().catch(() => {});
          }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" title="ملء الشاشة (F)" aria-label="ملء الشاشة">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" title="إغلاق (Esc)" aria-label="إغلاق العرض"><X className="h-4 w-4" /></button>
        </div>

        {hasImage ? (
          <>
            <img src={buildImageUrl(activeImage)} alt={doc.filename} className="max-h-full max-w-full select-none object-contain p-3 pt-16 sm:p-8 sm:pt-20" draggable={false} />
            {images.length > 1 && <>
              <button type="button" onClick={() => stepImage(-1)} disabled={activeImageIndex === 0} aria-label="الصورة السابقة" title="الصورة السابقة (السهم الأيمن)" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 text-white shadow-lg hover:bg-amber-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:text-slate-500 sm:right-6"><ChevronRight className="h-6 w-6" /></button>
              <button type="button" onClick={() => stepImage(1)} disabled={activeImageIndex === images.length - 1} aria-label="الصورة التالية" title="الصورة التالية (السهم الأيسر)" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 text-white shadow-lg hover:bg-amber-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:text-slate-500 sm:left-6"><ChevronLeft className="h-6 w-6" /></button>
            </>}
          </>
        ) : (
          <article className="mx-4 max-h-[75vh] max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-right sm:p-10">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold text-amber-300"><Layers className="h-4 w-4" /> مادة نصية</div>
            <h2 className="mb-5 text-xl font-black leading-relaxed sm:text-3xl">{doc.filename}</h2>
            <div className="whitespace-pre-wrap text-sm leading-8 text-slate-200 sm:text-lg">{cleanText.split('\n\n').slice(0, 12).join('\n\n')}</div>
          </article>
        )}

        {images.length > 1 && <div aria-live="polite" className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-white sm:bottom-5"><span>صورة</span> <span dir="ltr" className="inline-block">{activeImageIndex + 1} / {images.length}</span></div>}
      </section>
    </div>
  );
}
