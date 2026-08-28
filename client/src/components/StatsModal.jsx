import React from 'react';
import { X, BarChart3, Image, FolderTree, CheckCircle2, Clock, Compass, BookOpen } from 'lucide-react';

export default function StatsModal({ isOpen, onClose, stats }) {
  if (!isOpen || !stats) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                إحصائيات المنصة والأرشيف
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ملخص الفهرسة، المذاهب، والكتب والنصوص المستخرجة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
              <Image className="w-3.5 h-3.5 text-amber-500" />
              إجمالي الوثائق
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.totalDocuments?.toLocaleString('ar-EG')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
              <FolderTree className="w-3.5 h-3.5 text-amber-500" />
              المجلدات والأقسام
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.totalFolders?.toLocaleString('ar-EG')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              تم استخراج OCR
            </span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.completedOcr?.toLocaleString('ar-EG')}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              قيد الانتظار
            </span>
            <div className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">
              {stats.pendingOcr?.toLocaleString('ar-EG')}
            </div>
          </div>
        </div>

        {/* Sects Distribution */}
        {stats.sects && stats.sects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-500" />
              توزيع الوثائق حسب الأقسام
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.sects.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.sect || 'عام'}</span>
                  <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md text-[10px]">
                    {s.count.toLocaleString('ar-EG')} وثيقة
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Sources Ranking */}
        {stats.topSources && stats.topSources.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" />
              أبرز المصادر والكتب الأكثر توثيقاً
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {stats.topSources.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <span className="truncate text-slate-800 dark:text-slate-200 font-medium" title={b.book_source}>
                    {idx + 1}. {b.book_source}
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0 pr-2">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
