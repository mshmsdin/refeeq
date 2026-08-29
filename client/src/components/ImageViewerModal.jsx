import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  SunMedium, 
  Copy, 
  Flame, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  FileText, 
  Maximize2, 
  Check, 
  BookOpen, 
  Folder, 
  FolderTree,
  AlertCircle,
  RefreshCw,
  Tag as TagIcon,
  Plus,
  Minus,
  Type,
  Trash2,
  FolderPlus,
  Compass,
  Layers
} from 'lucide-react';

import { DEBATE_CATEGORIES } from '../utils/categories';

export default function ImageViewerModal({
  docId,
  searchQuery,
  onClose,
  onNavigateDoc,
  onToggleFavorite,
  onCopyImage,
  copiedDocId,
  onOpenProjector,
  onSelectTag,
  isFavorite
}) {
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [invert, setInvert] = useState(false);
  const [showOCRPanel, setShowOCRPanel] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedText, setCopiedText] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState(16);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  
  // Editor Tag state
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Multi-Folder Link state
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [folderSearchText, setFolderSearchText] = useState('');

  const imageRef = useRef(null);
  const viewportRef = useRef(null);

  // Zoom towards a specific screen coordinate (cursor position)
  const zoomAtPoint = (clientX, clientY, zoomMultiplier, targetZoom = null) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseRelX = clientX - centerX;
    const mouseRelY = clientY - centerY;

    setZoom((prevZoom) => {
      let newZoom = targetZoom !== null ? targetZoom : prevZoom * zoomMultiplier;
      newZoom = Math.min(Math.max(newZoom, 0.4), 6.0);
      const ratio = newZoom / prevZoom;

      setPan((prevPan) => {
        if (newZoom <= 1.05 && targetZoom === 1) {
          return { x: 0, y: 0 };
        }
        return {
          x: mouseRelX - (mouseRelX - prevPan.x) * ratio,
          y: mouseRelY - (mouseRelY - prevPan.y) * ratio
        };
      });

      return newZoom;
    });
  };


  // Add any custom phrase or line as tag
  const handleAddPhraseTag = (phrase) => {
    if (!phrase || !phrase.trim() || !docId) return;
    const cleanTag = phrase.trim();

    fetch(`/api/document/${docId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: cleanTag })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          loadDocumentDetails(docId);
          setSelectedText('');
        }
      })
      .catch((err) => console.error('Error adding phrase tag:', err));
  };

  const handleTextMouseUp = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text && text.length > 1 && text.length < 90) {
      setSelectedText(text);
    } else {
      setSelectedText('');
    }
  };

  // Fetch document details, tags, folders, and OCR bounding boxes
  const loadDocumentDetails = (id) => {
    setIsLoading(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setActiveImageIndex(0);


    fetch(`/api/document/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading document:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (docId) {
      loadDocumentDetails(docId);
    }
  }, [docId]);

  // Load all folders when folder picker is opened
  const openFolderPicker = () => {
    setIsFolderPickerOpen(true);
    fetch('/api/tree')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.tree)) {
          const flat = [];
          const traverse = (nodes) => {
            for (const n of nodes) {
              flat.push({ id: n.id, name: n.name, path: n.path, sect: n.sect, category: n.category });
              if (n.children && n.children.length > 0) {
                traverse(n.children);
              }
            }
          };
          traverse(data.tree);
          setAvailableFolders(flat);
        }
      })
      .catch((err) => console.error('Error fetching tree for picker:', err));
  };

  // Link document to another folder
  const handleLinkFolder = (folderId) => {
    if (!docId || !folderId) return;

    fetch(`/api/document/${docId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            folders: data.folders
          }));
          setIsFolderPickerOpen(false);
        }
      })
      .catch((err) => console.error('Error linking folder:', err));
  };

  // Remove document from a linked folder
  const handleUnlinkFolder = (folderId) => {
    if (!docId || !folderId) return;

    fetch(`/api/document/${docId}/folders/${folderId}`, {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            folders: data.folders
          }));
        }
      })
      .catch((err) => console.error('Error unlinking folder:', err));
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && docData?.prevDoc) onNavigateDoc(docData.prevDoc.id);
      if (e.key === 'ArrowLeft' && docData?.nextDoc) onNavigateDoc(docData.nextDoc.id);
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && docData?.document) {
        onCopyImage(docData.document);
      }
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.3, 5));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.3, 0.5));
      if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docData, onClose, onNavigateDoc, onCopyImage]);

  // Run on-demand OCR
  const handleTriggerOCR = () => {
    if (!docId || isOCRProcessing) return;
    setIsOCRProcessing(true);
    fetch(`/api/ocr/process-single/${docId}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setIsOCRProcessing(false);
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            document: data.document,
            boxes: data.boxes,
            tags: data.tags
          }));
        }
      })
      .catch((err) => {
        console.error('Error processing OCR:', err);
        setIsOCRProcessing(false);
      });
  };

  // Set Debate Category (Attack / Obligation / Defense)
  const handleSetCategory = (catKey) => {
    if (!docId) return;
    const currentCat = docData?.document?.category;
    const newCat = currentCat === catKey ? null : catKey;

    fetch(`/api/document/${docId}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCat })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            document: {
              ...prev.document,
              category: newCat
            }
          }));
        }
      })
      .catch((err) => console.error('Error updating category:', err));
  };

  // Add Tag
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTagInput.trim() || !docId) return;

    fetch(`/api/document/${docId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: newTagInput.trim() })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            tags: data.tags
          }));
          setNewTagInput('');
          setIsAddingTag(false);
        }
      })
      .catch((err) => console.error('Error adding tag:', err));
  };

  // Remove Tag
  const handleRemoveTag = (tagId) => {
    if (!docId) return;
    fetch(`/api/document/${docId}/tags/${tagId}`, {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocData((prev) => ({
            ...prev,
            tags: prev.tags.filter((t) => t.id !== tagId)
          }));
        }
      })
      .catch((err) => console.error('Error removing tag:', err));
  };

  // Copy full OCR text
  const handleCopyOCRText = () => {
    if (docData?.document?.ocr_text) {
      navigator.clipboard.writeText(docData.document.ocr_text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Highlight search keywords in text and render inline markdown images
  const renderHighlightedText = (text, query) => {
    if (!text) return null;

    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'image', alt: match[1], src: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.substring(lastIndex) });
    }

    const highlight = (str) => {
      if (!query || !query.trim() || !str) return str;
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
      const parts = str.split(regex);

      return parts.map((part, i) => {
        const isMatch = tokens.some((t) => part.toLowerCase() === t.toLowerCase());
        if (isMatch) {
          return (
            <mark key={i} className="bg-amber-400/40 dark:bg-amber-400/30 text-amber-950 dark:text-amber-200 px-0.5 rounded font-bold">
              {part}
            </mark>
          );
        }
        return part;
      });
    };

    return segments.map((seg, idx) => {
      if (seg.type === 'image') {
        const rawUrl = `/api/image/raw?path=${encodeURIComponent(seg.src)}`;
        return (
          <div key={idx} className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-black/20 p-1 flex flex-col items-center select-none">
            <img 
              src={rawUrl} 
              alt={seg.alt || 'وثيقة / صورة'} 
              className="max-h-72 object-contain rounded-lg shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
              onClick={() => window.open(rawUrl, '_blank')}
              loading="lazy"
            />
            {seg.alt && <span className="text-[10px] text-slate-500 mt-1 font-medium">{seg.alt}</span>}
          </div>
        );
      }
      return <span key={idx}>{highlight(seg.content)}</span>;
    });
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Double Click Handler: Zoom into cursor point or reset
  const handleDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('form')) return;
    if (zoom > 1.15) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      zoomAtPoint(e.clientX, e.clientY, 1, 2.5);
    }
  };

  // Attach non-passive wheel listener to zoom towards cursor
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheelZoom = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      zoomAtPoint(e.clientX, e.clientY, zoomFactor);
    };

    el.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelZoom);
    };
  }, [docId]);


  if (!docId) return null;

  const doc = docData?.document;
  const docImages = (doc?.images && doc.images.length > 0) ? doc.images : (doc?.full_path ? [doc.full_path] : []);
  const isAlbum = docImages.length > 1;
  const currentImageRel = docImages[activeImageIndex] || docImages[0] || doc?.full_path;
  const hasImage = Boolean(currentImageRel && /\.(jpe?g|png|webp|gif|bmp)$/i.test(currentImageRel));
  const imageUrl = hasImage ? `/api/image/raw?path=${encodeURIComponent(currentImageRel)}` : '';
  const isCopied = doc && copiedDocId === doc.id;
  const currentCat = doc?.category ? DEBATE_CATEGORIES[doc.category] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col animate-fadeIn select-none">
      
      {/* Top Modal Navigation Header */}
      <div className="h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        
        {/* Document Title & Path */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shrink-0"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {doc?.filename || 'جاري التحميل...'}
              </h2>
              {isAlbum && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-xs shrink-0">
                  <Layers className="w-3 h-3" />
                  <span>{activeImageIndex + 1} / {docImages.length}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <Folder className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{doc?.folder_name}</span>
              {doc?.sect && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                  {doc.sect}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Left Actions Group: Category Classification + Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Category Classification Buttons (هجوم • إلزام • دفاع) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-[11px] text-slate-400 px-2 font-medium">تصنيف الوثيقة:</span>
            {Object.values(DEBATE_CATEGORIES).map((cat) => {
              const isSelected = doc?.category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleSetCategory(cat.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? cat.activeBtn
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title={cat.description}
                >
                  <span className={cat.dotClass} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

          {/* Reader Font Controls for Text Articles */}
          {!hasImage && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setReaderFontSize((s) => Math.max(s - 2, 13))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="تصغير الخط (A-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-500 font-bold">
                {readerFontSize}px
              </span>
              <button
                onClick={() => setReaderFontSize((s) => Math.min(s + 2, 32))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="تكبير الخط (A+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}


          {/* Add to Debate Tray */}
          {doc && (
            <button
              onClick={() => onToggleFavorite(doc.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isFavorite
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="hidden md:inline">{isFavorite ? 'في السلة' : 'إضافة للسلة'}</span>
            </button>
          )}

          {/* Projector Mode (Only for documents with images) */}
          {doc && hasImage && (
            <button
              onClick={() => onOpenProjector(doc)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors"
              title="عرض بروجكتر للبث (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {/* Toggle OCR Panel (Only for image-based documents) */}
          {hasImage && (
            <button
              onClick={() => setShowOCRPanel(!showOCRPanel)}
              className={`p-2 rounded-xl border transition-colors ${
                showOCRPanel
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="إظهار / إخفاء لوحة نصوص الـ OCR"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Main Body: Image Canvas OR Single-Board Full Article Reader */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* Left/Main: Interactive Image Canvas OR Full Article Reader */}
        {hasImage ? (
          <div 
            ref={viewportRef}
            className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            {/* Navigation Arrows */}
            {docData?.prevDoc && (
              <button
                onClick={() => onNavigateDoc(docData.prevDoc.id)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-slate-900/80 hover:bg-amber-500 text-slate-300 hover:text-slate-950 backdrop-blur-md border border-slate-800 shadow-xl transition-all active:scale-95"
                title="الوثيقة السابقة (السهم الأيمن)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}


            {docData?.nextDoc && (
              <button
                onClick={() => onNavigateDoc(docData.nextDoc.id)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-slate-900/80 hover:bg-amber-500 text-slate-300 hover:text-slate-950 backdrop-blur-md border border-slate-800 shadow-xl transition-all active:scale-95"
                title="الوثيقة التالية (السهم الأيسر)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image Container with Transforms */}
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs">جاري تحميل الوثيقة...</p>
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={doc?.filename}
                  className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
                  style={{ filter: invert ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                  draggable={false}
                />
              </div>
            )}
          </div>



        ) : (
          /* النمط غير الصوري: لوحة قراءة موحدة كاملة للمقال */
          <div className="flex-1 bg-slate-100/60 dark:bg-slate-950 relative flex flex-col overflow-hidden">
            
            {/* Navigation Arrows for Text Reader */}
            {docData?.prevDoc && (
              <button
                onClick={() => onNavigateDoc(docData.prevDoc.id)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl transition-all active:scale-95 group"
                title={`المقال السابق: ${docData.prevDoc.filename}`}
              >
                <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {docData?.nextDoc && (
              <button
                onClick={() => onNavigateDoc(docData.nextDoc.id)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl transition-all active:scale-95 group"
                title={`المقال التالي: ${docData.nextDoc.filename}`}
              >
                <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Scrollable Single-Board Reader Canvas */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-12 lg:px-20">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Article Header Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        مقال وبحث فكري
                      </span>
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3 text-amber-500" />
                        {doc?.folder_name}
                      </span>
                    </div>
                    
                    <span className="font-mono text-slate-400">
                      {doc?.ocr_text ? `${Math.round(doc.ocr_text.length / 5)} كلمة تقريباً` : ''}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
                    {doc?.filename}
                  </h1>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      <span>{doc?.book_source || 'كتاب بصائر — د. هيثم طلعت'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyOCRText}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        {copiedText ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedText ? 'تم نسخ النص' : 'نسخ نص المقال'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Article Body: Full reading board */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div 
                    className="font-arabic text-slate-800 dark:text-slate-200 leading-[2.3] whitespace-pre-wrap select-text text-justify"
                    style={{ fontSize: `${readerFontSize}px` }}
                  >
                    {renderHighlightedText(doc?.ocr_text || '', searchQuery)}
                  </div>

                  {/* Article Tags & Metadata Bar at Bottom */}
                  {docData?.tags && docData.tags.length > 0 && (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <TagIcon className="w-3 h-3 text-amber-500" />
                        الوسوم والمفاهيم:
                      </span>
                      {docData.tags.map((t) => (
                        <span
                          key={t.id}
                          onClick={() => {
                            if (onSelectTag) onSelectTag(t.tag);
                            onClose();
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-500/20 dark:bg-slate-800 dark:hover:bg-amber-500/30 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors font-medium"
                        >
                          #{t.tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Right/Side: OCR Text & Metadata Panel (ONLY for image-based manuscripts) */}
        {hasImage && showOCRPanel && (
          <div className="w-full sm:w-96 lg:w-[420px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-10 animate-fadeIn">
            
            {/* Panel Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  النص المستخرج والتوثيق
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {doc?.ocr_status !== 'completed' && (
                  <button
                    onClick={handleTriggerOCR}
                    disabled={isOCRProcessing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isOCRProcessing ? 'animate-spin' : ''}`} />
                    <span>{isOCRProcessing ? 'جاري الاستخراج...' : 'تشغيل OCR'}</span>
                  </button>
                )}

                {doc?.ocr_text && (
                  <button
                    onClick={handleCopyOCRText}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'تم النسخ' : 'نسخ النص'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Panel Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              
              {/* Image Controls Toolbar (Embedded in Sidebar) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                {/* Copy Image Button */}
                {doc && (
                  <button
                    onClick={() => onCopyImage(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
                    title="نسخ الصورة للحافظة (Ctrl+C)"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ الصورة</span>
                  </button>
                )}

                {/* Zoom & Canvas Options */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="تكبير (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.4))}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="تصغير (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className="px-1.5 py-0.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-[11px] font-mono text-slate-500 dark:text-slate-400 transition-colors"
                    title="إعادة تعيين الأبعاد (0)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>

                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="تدوير الصورة 90 درجة"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setInvert(!invert)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      invert ? 'bg-amber-500 text-slate-950' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="عكس الألوان (الوضع الليلي للوثائق)"
                  >
                    <SunMedium className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* OCR Body Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>محتوى الوثيقة:</span>
                  <span className="text-[10px]">حدد أي عبارة لإضافتها كوسم سريع ⚡</span>
                </div>


                <div
                  onMouseUp={handleTextMouseUp}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans text-xs select-text selection:bg-amber-500/30"
                >
                  {doc?.ocr_text ? (
                    renderHighlightedText(doc.ocr_text, searchQuery)
                  ) : (
                    <p className="text-slate-400 text-center py-6">
                      لم يتم استخراج النص بعد. اضغط "تشغيل OCR" في الأعلى لقراءة الوثيقة.
                    </p>
                  )}
                </div>

                {/* Floating phrase adder */}
                {selectedText && (
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 animate-fadeIn">
                    <span className="text-[11px] text-amber-900 dark:text-amber-300 truncate font-semibold">
                      إضافة "{selectedText}" كوسم؟
                    </span>
                    <button
                      onClick={() => handleAddPhraseTag(selectedText)}
                      className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] shrink-0"
                    >
                      + إضافة
                    </button>
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                    الوسوم والكلمات الدلالية:
                  </span>
                  
                  <button
                    onClick={() => setIsAddingTag(!isAddingTag)}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {isAddingTag ? 'إلغاء' : '+ إضافة وسم'}
                  </button>
                </div>

                {isAddingTag && (
                  <form onSubmit={handleAddTag} className="flex gap-1.5">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="اسم الوسم الجديد..."
                      className="flex-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus-ring"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                    >
                      حفظ
                    </button>
                  </form>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {docData?.tags && docData.tags.length > 0 ? (
                    docData.tags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                      >
                        <span
                          onClick={() => {
                            if (onSelectTag) onSelectTag(t.tag);
                            onClose();
                          }}
                          className="cursor-pointer hover:text-amber-500"
                        >
                          #{t.tag}
                        </span>
                        <button
                          onClick={() => handleRemoveTag(t.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                          title="حذف الوسم"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">لا توجد وسوم مضافة</span>
                  )}
                </div>
              </div>

              {/* Linked Folders Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                    المجلدات المرتبطة:
                  </span>
                  
                  <button
                    onClick={openFolderPicker}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    + ربط بمجلد آخر
                  </button>
                </div>

                {isFolderPickerOpen && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <input
                      type="text"
                      value={folderSearchText}
                      onChange={(e) => setFolderSearchText(e.target.value)}
                      placeholder="ابحث عن مجلد لربطه..."
                      className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {availableFolders
                        .filter((f) => f.name.toLowerCase().includes(folderSearchText.toLowerCase()))
                        .map((f) => (
                          <div
                            key={f.id}
                            onClick={() => handleLinkFolder(f.id)}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-[11px] flex items-center justify-between"
                          >
                            <span className="truncate">{f.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{f.sect}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] font-semibold border border-amber-500/20">
                    📂 {doc?.folder_name} (رئيسي)
                  </span>

                  {docData?.folders?.map((f) => (
                    <span
                      key={f.folder_id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700"
                    >
                      <span>📁 {f.name}</span>
                      <button
                        onClick={() => handleUnlinkFolder(f.folder_id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                        title="إلغاء الربط"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Multi-Image Album Gallery Section in Left Sidebar */}
              {isAlbum && (
                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>صور الألبوم / المنشور ({docImages.length} صور):</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      صورة {activeImageIndex + 1} من {docImages.length}
                    </span>
                  </div>

                  {/* Thumbnails Grid inside Left Sidebar */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {docImages.map((imgRel, idx) => {
                      const thumbUrl = `/api/image/raw?path=${encodeURIComponent(imgRel)}`;
                      const isActive = idx === activeImageIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`group/thumb relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-100 dark:bg-slate-800 ${
                            isActive
                              ? 'border-amber-500 ring-2 ring-amber-500/50 scale-[1.03] shadow-md'
                              : 'border-slate-200 dark:border-slate-700/80 opacity-70 hover:opacity-100 hover:border-slate-400'
                          }`}
                          title={`عرض صورة ${idx + 1}`}
                        >
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                          <span className={`absolute bottom-1 right-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md shadow-sm ${
                            isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-950/85 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>

        )}

      </div>

    </div>
  );
}
