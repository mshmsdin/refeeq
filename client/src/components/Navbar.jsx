import React, { useEffect, useRef, useState } from 'react';
import { 
  Search, 
  X, 
  BookOpen, 
  Flame, 
  RefreshCw, 
  BarChart3, 
  Sun, 
  Moon, 
  Compass, 
  Sparkles,
  Menu,
  SlidersHorizontal,
  CircleHelp,
  MoreHorizontal
} from 'lucide-react';

import { DEBATE_CATEGORIES } from '../utils/categories';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  activeSect,
  setActiveSect,
  activeCategory,
  setActiveCategory,
  sectsList,
  theme,
  onToggleTheme,
  debateItemsCount,
  onOpenDebateTray,
  onOpenStats,
  onOpenCategoryGuide,
  onRescan,
  isScanning,
  stats,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  onOpenBible,
  onOpenFeatures
}) {
  const searchInputRef = useRef(null);
  const toolsRef = useRef(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const headerRef = useRef(null);
  const totalArchives = sectsList?.find(s => s.sect === 'all')?.count ?? stats?.totalDocuments;
  const openTool = callback => {
    setToolsOpen(false);
    callback?.();
  };

  useEffect(() => {
    const update = () => document.documentElement.style.setProperty('--archive-header-height', `${headerRef.current?.getBoundingClientRect().height || 0}px`);
    const observer = new ResizeObserver(update);
    if (headerRef.current) observer.observe(headerRef.current);
    update();
    const closeTools = event => {
      if (!toolsRef.current?.querySelector('#archive-tools-panel')) return;
      if (event.type === 'keydown' && event.key === 'Escape') {
        setToolsOpen(false);
        toolsRef.current.querySelector('button')?.focus();
      } else if (event.type === 'pointerdown' && !toolsRef.current.contains(event.target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeTools);
    document.addEventListener('keydown', closeTools);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', closeTools);
      document.removeEventListener('keydown', closeTools);
      document.documentElement.style.removeProperty('--archive-header-height');
    };
  }, []);

  // Focus search on '/' key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.target?.closest?.('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header ref={headerRef} className="archive-navigation sticky top-0 z-30 app-header shadow-sm transition-colors border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-5 py-2.5 flex flex-col gap-2.5">
        
        {/* Row 1: Brand, Search Bar, Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand & Mobile Sidebar Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile Sidebar Button */}
            <button
              onClick={onToggleMobileSidebar}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 md:hidden hover:bg-slate-200 dark:hover:bg-slate-700 btn-press transition-colors"
              title="شجرة الأقسام والمجلدات"
              aria-label="قائمة المجلدات"
              aria-expanded={isMobileSidebarOpen}
              aria-controls="archive-folder-drawer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0 transform hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="block">
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-50 tracking-tight">
                    رفيق المناظر
                  </h1>
                  <span className="hidden 2xl:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-bold shadow-xs">
                    الأرشيف التوثيقي
                  </span>
                </div>
                <p className="hidden lg:block text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  {totalArchives != null ? `${totalArchives.toLocaleString('ar-EG')} وثيقة ومصدر موثق` : 'جاري التحميل...'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative order-last w-full basis-full lg:order-none lg:w-auto lg:basis-0 lg:flex-1 lg:max-w-2xl">
            <label htmlFor="archive-search" className="sr-only">ابحث في الأرشيف</label>
            <input
              id="archive-search"
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في العناوين ونصوص الوثائق والوسوم..."
              className="archive-search w-full pl-9 pr-10 py-3 lg:py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-500 dark:border-slate-500 text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-300 text-sm transition-all"
            />
            
            <Search className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 transition-colors btn-press"
                title="مسح البحث"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute left-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 text-[10px] font-mono select-none">
                /
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Bible Button */}
            {onOpenBible && (
              <button
                onClick={onOpenBible}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/25 text-xs font-bold transition-all btn-press"
                title="البيبل"
                aria-label="فتح البيبل"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">البيبل</span>
              </button>
            )}

            <div ref={toolsRef} className="relative archive-tools">
              <button type="button" onClick={() => setToolsOpen(open => !open)} aria-expanded={toolsOpen} aria-controls="archive-tools-panel" className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-500 cursor-pointer" aria-label="أدوات الموقع" title="التعليمات وأدوات الموقع">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {toolsOpen && <div id="archive-tools-panel" className="absolute end-0 top-full mt-2 z-40 w-56 rounded-xl border border-slate-500 bg-white dark:bg-slate-900 shadow-xl p-1.5 text-slate-700 dark:text-slate-200">
                <label className="block px-2 py-2 text-xs">عرض المواد
                  <select aria-label="عرض المواد" value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-500 bg-white p-2 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <option value="all">جميع المواد</option><option value="favorites">المحفوظة في سلة البث</option><option value="ocr_completed">مواد استُخرج نصها</option>
                  </select>
                </label>
                {onOpenFeatures && <button className="archive-tool-option" onClick={() => openTool(onOpenFeatures)}><CircleHelp className="w-4 h-4" />طريقة استخدام الموقع</button>}
                <button className="archive-tool-option" onClick={() => openTool(onOpenCategoryGuide)}><Sparkles className="w-4 h-4" />دليل هجوم وإلزام ودفاع</button>
                <button className="archive-tool-option" onClick={() => openTool(onOpenStats)}><BarChart3 className="w-4 h-4" />إحصائيات الأرشيف</button>
                <button className="archive-tool-option" disabled={isScanning} onClick={() => openTool(onRescan)}><RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />{isScanning ? 'جارٍ تحديث الفهرس...' : 'تحديث الفهرس والأقسام'}</button>
              </div>}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/70 transition-all btn-press"
              title={theme === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
              aria-label="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Debate Tray Button */}
            <button
              onClick={onOpenDebateTray}
              aria-label="سلة البث"
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all btn-press"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">سلة البث</span>
              {debateItemsCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-slate-950 text-amber-400 rounded-full flex items-center justify-center font-extrabold text-[10px] shadow-xs">
                  {debateItemsCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Row 2: Sect Selector & Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          
          {/* Multi-Sect Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none max-w-full">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 shrink-0 font-bold pl-1 text-[11px]">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>القسم:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-nowrap">
              {/* All Sects Button */}
              <button
                onClick={() => setActiveSect('all')}
                aria-pressed={!activeSect || activeSect === 'all'}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 btn-press ${
                  activeSect === 'all' || !activeSect
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                    : 'bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                <span>الكل</span>
                {totalArchives != null && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    activeSect === 'all' || !activeSect ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {totalArchives.toLocaleString('ar-EG')}
                  </span>
                )}
              </button>

              {sectsList && sectsList.length > 0 ? (
                sectsList.filter(s => s.sect !== 'all').map((s) => {
                  const isActive = activeSect === s.sect;
                  const displayName = {
                    'شيعة': 'الشيعة الإمامية',
                    'نصارى': 'النصارى والمسيحية',
                    'إلحاد': 'الإلحاد واللادينية',
                    'سلفية': 'أهل السنة'
                  }[s.sect] || s.name || s.sect;

                  return (
                    <button
                      key={s.sect}
                      onClick={() => setActiveSect(s.sect)}
                      aria-pressed={isActive}
                      className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 btn-press ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                          : 'bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
                      }`}
                    >
                      <span>{displayName}</span>
                      {s.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {s.count.toLocaleString('ar-EG')}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : null}
            </div>
          </div>


          {/* 3 Categories Filter Pills (هجوم 🔴 • إلزام 🟡 • دفاع 🟢) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 shrink-0 font-bold pl-1 text-[11px]">
              <SlidersHorizontal className="w-3 h-3 text-slate-600" />
              <span>الصنف:</span>
            </div>

            {/* All */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all btn-press ${
                activeCategory === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/60'
              }`}
            >
              الكل
            </button>

            <button aria-pressed={activeCategory === 'uncategorized'} onClick={() => setActiveCategory('uncategorized')} className="archive-tool-option whitespace-nowrap">غير مصنف</button>
            {/* Attack */}
            <button
              onClick={() => setActiveCategory(activeCategory === 'attack' ? 'all' : 'attack')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 btn-press ${
                activeCategory === 'attack'
                  ? DEBATE_CATEGORIES.attack.activeBtn
                  : DEBATE_CATEGORIES.attack.inactiveBtn
              }`}
              title="هجوم: ضلالات وتناقضات في كتبهم"
            >
              <span className={DEBATE_CATEGORIES.attack.dotClass} />
              <span>هجوم</span>
            </button>

            {/* Obligation */}
            <button
              onClick={() => setActiveCategory(activeCategory === 'obligation' ? 'all' : 'obligation')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 btn-press ${
                activeCategory === 'obligation'
                  ? DEBATE_CATEGORIES.obligation.activeBtn
                  : DEBATE_CATEGORIES.obligation.inactiveBtn
              }`}
              title="إلزام: نصوص في كتبهم توافق ما عندنا"
            >
              <span className={DEBATE_CATEGORIES.obligation.dotClass} />
              <span>إلزام</span>
            </button>

            {/* Defense */}
            <button
              onClick={() => setActiveCategory(activeCategory === 'defense' ? 'all' : 'defense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 btn-press ${
                activeCategory === 'defense'
                  ? DEBATE_CATEGORIES.defense.activeBtn
                  : DEBATE_CATEGORIES.defense.inactiveBtn
              }`}
              title="دفاع: ردود وتفنيد للشبهات ضدنا"
            >
              <span className={DEBATE_CATEGORIES.defense.dotClass} />
              <span>دفاع</span>
            </button>

          </div>

        </div>

      </div>
    </header>
  );
}
