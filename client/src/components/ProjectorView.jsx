import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, X, Copy, Check } from 'lucide-react';

export default function ProjectorView({ doc, onClose, onCopyImage, copiedDocId }) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!doc) return null;

  const imageUrl = `/api/image/raw?path=${encodeURIComponent(doc.full_path)}`;
  const isCopied = copiedDocId === doc.id;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden cursor-none hover:cursor-default"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Top Floating Mini Controls (auto-hides for clean OBS broadcast) */}
      <div 
        className={`absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => onCopyImage(doc)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>نسخ الصورة</span>
        </button>

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
              setIsFullscreen(true);
            } else {
              document.exitFullscreen();
              setIsFullscreen(false);
            }
          }}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
          title="ملء الشاشة (F)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500 hover:text-white text-slate-300 transition-colors"
          title="إغلاق نافذة البث (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Broadcast Canvas */}
      <div className="w-full h-full flex items-center justify-center p-2 select-none">
        <img
          src={imageUrl}
          alt={doc.filename}
          className="max-h-screen max-w-screen object-contain"
        />
      </div>

      {/* Bottom Subtitle / Info */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-xl border border-slate-800 text-center transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h3 className="text-xs font-bold text-slate-200">{doc.filename}</h3>
        <p className="text-[10px] text-amber-400 font-medium">{doc.folder_name} {doc.book_source ? `• ${doc.book_source}` : ''}</p>
      </div>
    </div>
  );
}
