import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Search, FolderTree, FileImage, X } from 'lucide-react';
import { DEBATE_CATEGORIES } from '../utils/categories';

function TreeNode({ node, activeFolder, onSelectFolder, level = 0, forceExpand = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children?.length > 0;
  const isSelected = activeFolder === node.path;
  const isAncestor = Boolean(activeFolder && (activeFolder.startsWith(node.path + '/') || activeFolder.startsWith(node.path + '\\')));
  const catMeta = node.category ? DEBATE_CATEGORIES[node.category] : null;
  useEffect(() => { if (isAncestor || forceExpand) setIsOpen(true); }, [isAncestor, forceExpand]);

  return (
    <div className="select-none">
      <div style={{ paddingRight: `${Math.min(level, 5) * 8 + 4}px` }} className={`group flex items-center rounded-xl border ${isSelected ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-300' : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}>
        {hasChildren ? (
          <button onClick={() => setIsOpen(open => !open)} className="archive-folder-button shrink-0 p-2 rounded-lg" aria-expanded={isOpen} aria-label={`${isOpen ? 'طي' : 'توسيع'} ${node.name}`}>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : <span className="w-3 shrink-0" />}
        <button onClick={() => onSelectFolder(node.path, node.id)} aria-current={isSelected ? 'location' : undefined} title={node.path} className="archive-folder-button flex min-h-[40px] min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-2 pe-2 text-start text-[13px] font-semibold">
          <span className="flex min-w-0 items-center gap-2">
            {catMeta ? <span className={catMeta.dotClass} /> : isOpen ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
            <span className="truncate">{node.name}</span>
          </span>
          {node.file_count > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{node.file_count.toLocaleString('ar-EG')}</span>}
        </button>
      </div>
      {isOpen && hasChildren && <div className="mr-2 border-r border-slate-200 pr-1 dark:border-slate-700">
        {node.children.map(child => <TreeNode key={child.id || child.path} node={child} activeFolder={activeFolder} onSelectFolder={onSelectFolder} level={level + 1} forceExpand={forceExpand} />)}
      </div>}
    </div>
  );
}

export default function SidebarTree({
  treeData,
  activeFolder,
  onSelectFolder,
  totalDocsCount,
  isMobileOpen,
  onCloseMobile
}) {
  const [filterText, setFilterText] = useState('');
  const drawerRef = useRef(null);
  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) onCloseMobile?.(); };
    desktop.addEventListener('change', closeOnDesktop);
    const frame = requestAnimationFrame(() => drawerRef.current?.querySelector('button, input')?.focus());
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseMobile?.(); }
      if (event.key === 'Tab') {
        const items = [...(drawerRef.current?.querySelectorAll('button, input, [tabindex="0"]') || [])].filter(item => !item.disabled);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', closeOnDesktop);
      if (previous?.isConnected) previous.focus();
    };
  }, [isMobileOpen, onCloseMobile]);

  // Filter tree nodes by search text recursively
  const filterNodes = (nodes, text) => {
    if (!text.trim()) return nodes;
    const cleanText = text.trim().toLowerCase();

    return nodes
      .map((node) => {
        const matches = node.name.toLowerCase().includes(cleanText);
        const filteredChildren = node.children ? filterNodes(node.children, text) : [];
        if (matches || filteredChildren.length > 0) {
          return {
            ...node,
            children: matches ? node.children : filteredChildren
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const filteredTree = useMemo(() => {
    return filterNodes(treeData, filterText);
  }, [treeData, filterText]);

  const content = (
    <div className="flex flex-col h-full select-none bg-white dark:bg-slate-900/90 backdrop-blur-md">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              الأقسام والمجلدات
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {totalDocsCount && (
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {totalDocsCount.toLocaleString('ar-EG')} وثيقة
              </span>
            )}
            {/* Close button on mobile */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 md:hidden"
                aria-label="إغلاق القائمة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search inside folders */}
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="ابحث عن قسم أو موضوع..."
            aria-label="البحث في الأقسام والمجلدات"
            className="archive-folder-button w-full pl-7 pr-8 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-500 dark:border-slate-500 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-300 focus-ring"
          />
          <Search className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2 pointer-events-none" />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              aria-label="مسح البحث في الأقسام"
              className="absolute left-2.5 top-1.5 p-0.5 rounded text-slate-600 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Folders Tree View */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {/* All Documents Option */}
        <button
          type="button"
          aria-current={activeFolder === '' ? 'location' : undefined}
          onClick={() => {
            onSelectFolder('');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`archive-folder-button flex min-h-[44px] w-full items-center justify-between py-2 px-2.5 rounded-xl text-start transition-all text-xs font-bold ${
            activeFolder === ''
              ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-amber-500" />
            <span>جميع الوثائق والمصوّرات</span>
          </span>
          {totalDocsCount && (
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {totalDocsCount.toLocaleString('ar-EG')}
            </span>
          )}
        </button>

        {filteredTree.map((node) => (
          <TreeNode
            key={node.id || node.path}
            forceExpand={Boolean(filterText.trim())}
            node={node}
            activeFolder={activeFolder}
            onSelectFolder={(p, id) => {
              onSelectFolder(p, id);
              if (onCloseMobile) onCloseMobile();
            }}
          />
        ))}

        {filteredTree.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-300">
            لا توجد مجلدات مطابقة
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-72 lg:w-80 border-l border-slate-200/80 dark:border-slate-800/80 shrink-0 h-[calc(100dvh-var(--archive-header-height,9rem))] sticky top-[var(--archive-header-height,9rem)]">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
            onClick={onCloseMobile}
          />
          <div ref={drawerRef} id="archive-folder-drawer" role="dialog" aria-modal="true" aria-label="أقسام الأرشيف" className="relative w-4/5 max-w-xs h-full z-50 shadow-2xl animate-slideUp">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
