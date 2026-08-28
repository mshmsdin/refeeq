import React from 'react';
import { 
  Flame, 
  Bookmark, 
  Copy, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Folder, 
  FolderTree,
  Maximize2, 
  Check, 
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  FileQuestion,
  FileText,
  Quote
} from 'lucide-react';
import { DEBATE_CATEGORIES } from '../utils/categories';

export default function DocumentGrid({
  documents,
  subfolders,
  activeFolder,
  onSelectFolder,
  total,
  page,
  limit,
  onPageChange,
  onOpenDoc,
  onToggleFavorite,
  onCopyImage,
  copiedDocId,
  onOpenProjector,
  onSelectTag,
  favoritesMap,
  isLoading,
  activeCategory,
  onResetFilters,
  searchTerm,
  activeTag
}) {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasSubfolders = subfolders && subfolders.length > 0;
  const hasDocuments = documents && documents.length > 0;
  const isFilterActive = !!searchTerm || activeCategory !== 'all' || !!activeTag;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="app-card p-3.5 space-y-3 animate-pulse bg-white/50 dark:bg-slate-800/40">
              <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-lg w-2/3" />
              <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800/80 rounded-xl" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fadeIn">
      
      {/* 1. Subfolders Section (الأقسام والمجلدات الفرعية) */}
      {hasSubfolders && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FolderTree className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeFolder ? 'المجلدات والأقسام التابعة' : 'التصنيفات والأقسام الرئيسية'}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
              {subfolders.length} قسم
            </span>
          </div>

          {/* Subfolders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subfolders.map((sf) => {
              const sfCat = sf.category ? DEBATE_CATEGORIES[sf.category] : null;

              return (
                <div
                  key={sf.id || sf.path}
                  onClick={() => onSelectFolder(sf.path, sf.id)}
                  className={`group p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 hover:border-amber-500/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                    sfCat ? sfCat.hoverBorder : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {sfCat ? (
                        <span className={sfCat.dotClass} title={`صنف: ${sfCat.name}`} />
                      ) : (
                        <Folder className="w-4 h-4 text-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {sf.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                        {sf.file_count ? `${sf.file_count.toLocaleString('ar-EG')} وثيقة` : 'قسم فرعي'}
                      </span>
                    </div>
                  </div>

                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:-translate-x-1 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Documents Section */}
      {hasDocuments ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                الوثائق والمصوّرات المتاحة
              </h3>
            </div>
            
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              عرض {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} من أصل {total.toLocaleString('ar-EG')} وثيقة
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {documents.map((doc) => {
              const isFav = !!favoritesMap[doc.id];
              const isCopied = copiedDocId === doc.id;
              const hasImage = Boolean(doc.full_path && /\.(jpe?g|png|webp|gif|bmp)$/i.test(doc.full_path));
              const imageUrl = hasImage ? `/api/image/raw?path=${encodeURIComponent(doc.full_path)}` : '';
              const docCat = doc.category ? DEBATE_CATEGORIES[doc.category] : null;
              const textSnippet = doc.ocr_text 
                ? doc.ocr_text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/#+\s*/g, '').trim()
                : '';

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc.id)}
                  className="group app-card p-3.5 flex flex-col justify-between cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800/90 hover:border-amber-500/50 transition-all duration-200 shadow-xs hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Top Metadata */}
                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate font-medium" title={doc.folder_name}>
                        <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{doc.folder_name}</span>
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Category Badge */}
                        {docCat && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold flex items-center gap-1 ${docCat.badgeClass}`}>
                            <span className={docCat.dotClass} />
                            {docCat.name}
                          </span>
                        )}

                        {/* Document Type Badge */}
                        {hasImage ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold" title="وثيقة مصورة">
                            مُصوّر
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold flex items-center gap-0.5" title="مقال وبحث نصي">
                            <FileText className="w-2.5 h-2.5" />
                            مقال
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Book Source Tag */}
                    {doc.book_source && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-semibold truncate max-w-full">
                        <BookOpen className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="truncate">{doc.book_source}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Preview: Image Card vs Text Article Card */}
                  {hasImage ? (
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 mb-2.5 group/img">
                      <img
                        src={imageUrl}
                        alt={doc.filename}
                        loading="lazy"
                        className="w-full h-full object-contain p-1 transform group-hover/img:scale-105 transition-transform duration-300"
                      />

                      {/* Hover Quick Action Buttons */}
                      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2">
                        {/* Copy Image */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyImage(doc);
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950 shadow-md transition-all btn-press"
                          title="نسخ الصورة للحافظة"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Add to Debate Tray */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(doc.id);
                          }}
                          className={`p-2.5 rounded-xl shadow-md transition-all btn-press ${
                            isFav
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950'
                          }`}
                          title={isFav ? 'إزالة من سلة البث' : 'إضافة إلى سلة البث والمناظرة'}
                        >
                          <Flame className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>

                        {/* Projector View */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProjector(doc);
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950 shadow-md transition-all btn-press"
                          title="عرض كامل على البروجكتر والبث (F)"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* النمط غير الصوري: بطاقة المقال النصي */
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/5 via-slate-50 to-slate-100/80 dark:from-amber-500/[0.03] dark:via-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 mb-2.5 p-3.5 flex flex-col justify-between group/textcard group-hover:border-amber-500/30 transition-all">
                      
                      {/* Top Header of Text Card */}
                      <div className="flex items-center justify-between text-slate-400">
                        <Quote className="w-4 h-4 text-amber-500/60" />
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {textSnippet.length > 0 ? `${Math.round(textSnippet.length / 5)} كلمة` : ''}
                        </span>
                      </div>

                      {/* Excerpt Body */}
                      <div className="flex-1 my-2 overflow-hidden flex flex-col justify-center">
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-6 font-tajawal select-none text-right">
                          {textSnippet || 'مقال وبحث فكري متكامل، انقر لفتح القارئ الكامل...'}
                        </p>
                      </div>

                      {/* Bottom indicator */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/80 text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <BookOpen className="w-3 h-3 text-amber-500/80" />
                          قراءة المقال
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px] group-hover/textcard:-translate-x-1 transition-transform">
                          فتح ←
                        </span>
                      </div>

                      {/* Hover Actions for Text Card */}
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover/textcard:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2">
                        {/* Copy Text */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyImage(doc);
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950 shadow-md transition-all btn-press"
                          title="نسخ نص المقال للحافظة"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Add to Debate Tray */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(doc.id);
                          }}
                          className={`p-2.5 rounded-xl shadow-md transition-all btn-press ${
                            isFav
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950'
                          }`}
                          title={isFav ? 'إزالة من سلة البث' : 'إضافة إلى سلة البث والمناظرة'}
                        >
                          <Flame className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>

                        {/* Open Reader */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDoc(doc.id);
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/90 text-slate-200 hover:bg-amber-500 hover:text-slate-950 shadow-md transition-all btn-press"
                          title="فتح المقال في القارئ الكامل"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Document Title */}
                  <div className="space-y-2">
                    <h4 
                      className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </h4>

                    {/* Tags Pills */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTag) onSelectTag(tag);
                            }}
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 hover:bg-amber-500/15 dark:bg-slate-700/60 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-xs btn-press"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                  let pNum;
                  if (totalPages <= 5) {
                    pNum = idx + 1;
                  } else if (page <= 3) {
                    pNum = idx + 1;
                  } else if (page >= totalPages - 2) {
                    pNum = totalPages - 4 + idx;
                  } else {
                    pNum = page - 2 + idx;
                  }

                  return (
                    <button
                      key={pNum}
                      onClick={() => onPageChange(pNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all btn-press ${
                        page === pNum
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-xs btn-press"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : !hasSubfolders ? (
        /* Empty State */
        <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-sm">
            <FileQuestion className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              لا توجد وثائق مطابقة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isFilterActive
                ? 'قد تكون بعض الفلاتر (مثل تصنيف هجوم/إلزام/دفاع أو البحث) مفعلة وتقيد النتائج.'
                : 'لم يتم العثور على وثائق في هذا القسم حالياً.'}
            </p>
          </div>

          {isFilterActive && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm shadow-amber-500/20 transition-all btn-press"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر وعرض الكل</span>
            </button>
          )}
        </div>
      ) : null}

    </div>
  );
}
