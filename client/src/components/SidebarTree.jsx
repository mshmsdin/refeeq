import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Search, FolderTree, FileImage, X } from 'lucide-react';
import { DEBATE_CATEGORIES } from '../utils/categories';

function TreeNode({ node, activeFolder, onSelectFolder, level = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = activeFolder === node.path;

  // Auto-expand if activeFolder is inside this node
  const isAncestor = activeFolder && (activeFolder.startsWith(node.path + '/') || activeFolder.startsWith(node.path + '\\'));

  const catMeta = node.category ? DEBATE_CATEGORIES[node.category] : null;

  return (
    <div className="select-none">
      <div
        onClick={() => onSelectFolder(node.path, node.id)}
        style={{ paddingRight: `${level * 14 + 8}px` }}
        className={`group flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer transition-all text-xs font-semibold ${
          isSelected
            ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold border border-amber-500/30 shadow-xs'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
              aria-label={isOpen || isAncestor ? 'طي المجلد' : 'توسيع المجلد'}
            >
              {isOpen || isAncestor ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {catMeta ? (
            <span className={catMeta.dotClass} title={`صنف: ${catMeta.name}`} />
          ) : isOpen || isAncestor ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0 stroke-[2]" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500/70 group-hover:text-amber-500 shrink-0 transition-colors" />
          )}

          <span className="truncate text-[12px]" title={node.name}>
            {node.name}
          </span>
        </div>

        {node.file_count > 0 && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 font-bold ${
              isSelected
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {node.file_count.toLocaleString('ar-EG')}
          </span>
        )}
      </div>

      {(isOpen || isAncestor) && hasChildren && (
        <div className="border-r border-slate-200/80 dark:border-slate-800 mr-3 pr-1 space-y-0.5 mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id || child.path}
              node={child}
              activeFolder={activeFolder}
              onSelectFolder={onSelectFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
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
            children: filteredChildren
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
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {totalDocsCount.toLocaleString('ar-EG')} وثيقة
              </span>
            )}
            {/* Close button on mobile */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden"
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
            placeholder="تصفية شجرة المجلدات..."
            className="w-full pl-7 pr-8 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus-ring"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute left-2.5 top-1.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Folders Tree View */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {/* All Documents Option */}
        <div
          onClick={() => {
            onSelectFolder('');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer transition-all text-xs font-bold ${
            activeFolder === ''
              ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-amber-500" />
            <span>جميع الوثائق والمصوّرات</span>
          </div>
          {totalDocsCount && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {totalDocsCount.toLocaleString('ar-EG')}
            </span>
          )}
        </div>

        {filteredTree.map((node) => (
          <TreeNode
            key={node.id || node.path}
            node={node}
            activeFolder={activeFolder}
            onSelectFolder={(p, id) => {
              onSelectFolder(p, id);
              if (onCloseMobile) onCloseMobile();
            }}
          />
        ))}

        {filteredTree.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            لا توجد مجلدات مطابقة
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-72 lg:w-80 border-l border-slate-200/80 dark:border-slate-800/80 shrink-0 h-[calc(100vh-6.8rem)] sticky top-[6.8rem]">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs h-full z-50 shadow-2xl animate-slideUp">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
