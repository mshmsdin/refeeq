import React, { useEffect } from 'react';
import { Flame, X, Trash2, Copy, Maximize2, Check, BookOpen } from 'lucide-react';

export default function DebateTray({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onClearFavorites,
  onOpenDoc,
  onCopyImage,
  copiedDocId,
  onOpenProjector
}) {
  // Keyboard numbers [1-9] to quickly open/copy the corresponding favorite
  useEffect(() => {
    if (!isOpen && favorites.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= Math.min(favorites.length, 9)) {
        const item = favorites[num - 1];
        if (item) {
          if (e.altKey) {
            onCopyImage(item);
          } else {
            onOpenDoc(item.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, favorites, onOpenDoc, onCopyImage]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slideUp text-slate-800 dark:text-slate-100">
      {/* Tray Header */}
      <div className="p-3.5 bg-amber-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              سلة البث والمناظرة الحية
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold">
                {favorites.length}
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              اضغط الأرقام (1-9) لفتح الوثيقة بسرعة أثناء الحوار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {favorites.length > 0 && (
            <button
              onClick={onClearFavorites}
              className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 transition-colors text-xs"
              title="تفريغ السلة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tray Items List */}
      <div className="max-h-96 overflow-y-auto p-2.5 space-y-2">
        {favorites.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Flame className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold">السلة فارغة حالياً</p>
            <p className="text-[10px] leading-relaxed">
              انقر على أيقونة الشعلة بجانب أي وثيقة لإضافتها هنا والوصول إليها بلمسة زر أثناء المناظرة.
            </p>
          </div>
        ) : (
          favorites.map((doc, idx) => {
            const isCopied = copiedDocId === doc.id;
            const imageUrl = `/api/image/raw?path=${encodeURIComponent(doc.full_path)}`;

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDoc(doc.id)}
                className="group p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-amber-500/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all shadow-sm"
              >
                {/* Index badge [1..9] */}
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700">
                  <img
                    src={imageUrl}
                    alt={doc.filename}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-500 transition-colors">
                    {doc.filename}
                  </h5>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
                    {doc.folder_name}
                  </span>
                </div>

                {/* Quick Item Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Copy Image */}
                  <button
                    onClick={() => onCopyImage(doc)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="نسخ الصورة (Alt + الرقم)"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Projector */}
                  <button
                    onClick={() => onOpenProjector(doc)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500"
                    title="عرض على البروجكتر"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveFavorite(doc.id)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500"
                    title="إزالة من السلة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
