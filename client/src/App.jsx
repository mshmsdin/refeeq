import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SidebarTree from './components/SidebarTree';
import DocumentGrid from './components/DocumentGrid';
import ImageViewerModal from './components/ImageViewerModal';
import DebateTray from './components/DebateTray';
import ProjectorView from './components/ProjectorView';
import StatsModal from './components/StatsModal';
import CategoryGuideModal from './components/CategoryGuideModal';
import BibleSection from './components/BibleSection';
import { Tag as TagIcon, X, Compass, Folder, ChevronLeft, Link2, Check, Sparkles, RotateCcw, BookOpen } from 'lucide-react';
import { parseCurrentRoute, buildRouteUrl, buildBibleUrl, pushRouteUrl } from './utils/urlRoutes';
import { DEBATE_CATEGORIES } from './utils/categories';

export default function App() {
  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  // Parse initial route from URL
  const initialRoute = parseCurrentRoute();

  // Bible section state
  const [isBibleView, setIsBibleView] = useState(initialRoute.page === 'bible');

  // Listen to popstate to handle browser back/forward
  useEffect(() => {
    const handlePop = () => {
      const r = parseCurrentRoute();
      setIsBibleView(r.page === 'bible');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);


  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('');
  const [activeFolderId, setActiveFolderId] = useState(initialRoute.folderId || null);
  const [activeFolderCategory, setActiveFolderCategory] = useState(null);
  const [activeSect, setActiveSect] = useState(initialRoute.sect || 'all');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'attack' | 'obligation' | 'defense'
  const [activeTag, setActiveTag] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'favorites' | 'ocr_completed'
  const [page, setPage] = useState(1);
  const limit = 24;

  const [documents, setDocuments] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const [treeData, setTreeData] = useState([]);
  const [sectsList, setSectsList] = useState([]);
  const [stats, setStats] = useState(null);

  const [favorites, setFavorites] = useState([]);
  const [favoritesMap, setFavoritesMap] = useState({});

  const [activeDocId, setActiveDocId] = useState(initialRoute.docId || null);
  const [projectorDoc, setProjectorDoc] = useState(null);
  const [isDebateTrayOpen, setIsDebateTrayOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedDocId, setCopiedDocId] = useState(null);
  const [copiedFolderLink, setCopiedFolderLink] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync theme class on <html> element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Show temporary toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // If initial route has folderId, fetch folder details
  useEffect(() => {
    if (initialRoute.folderId) {
      fetch(`/api/folder/${initialRoute.folderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.folder) {
            setActiveFolder(data.folder.path);
            setActiveFolderId(data.folder.id);
            setActiveFolderCategory(data.folder.category || null);
            if (data.folder.sect) {
              setActiveSect(data.folder.sect);
            }
          }
        })
        .catch((err) => console.error('Error fetching initial folder:', err));
    }
  }, []);

  // Synchronize browser URL when activeSect, activeFolderId, or activeDocId changes
  useEffect(() => {
    const activeDoc = documents.find((d) => d.id === activeDocId);
    const isArticle = activeDoc ? !activeDoc.full_path : (activeSect === 'إلحاد');

    pushRouteUrl({
      sect: activeSect,
      folderId: activeFolderId,
      docId: activeDocId,
      isArticle: Boolean(isArticle)
    });
  }, [activeSect, activeFolderId, activeDocId, documents]);

  // Handle browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      setActiveSect(route.sect || 'all');
      setActiveDocId(route.docId || null);

      if (route.folderId) {
        fetch(`/api/folder/${route.folderId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.success && data.folder) {
              setActiveFolder(data.folder.path);
              setActiveFolderId(data.folder.id);
              setActiveFolderCategory(data.folder.category || null);
            }
          })
          .catch(() => {});
      } else {
        setActiveFolder('');
        setActiveFolderId(null);
        setActiveFolderCategory(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Tree & Stats on mount and when activeSect changes
  const fetchTreeAndStats = useCallback(() => {
    const sectParam = activeSect && activeSect !== 'all' ? `?sect=${encodeURIComponent(activeSect)}` : '';

    fetch(`/api/tree${sectParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.tree)) {
          setTreeData(data.tree);
        }
      })
      .catch((err) => console.error('Error fetching tree:', err));

    fetch(`/api/stats${sectParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setStats(data.stats || data);
        }
      })
      .catch((err) => console.error('Error fetching stats:', err));

    fetch('/api/sects')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.sects)) {
          setSectsList(data.sects);
        }
      })
      .catch((err) => console.error('Error fetching sects:', err));
  }, [activeSect]);

  useEffect(() => {
    fetchTreeAndStats();
  }, [fetchTreeAndStats]);

  // Fetch Favorites
  const fetchFavorites = () => {
    fetch('/api/favorites')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFavorites(data.favorites || []);
          const map = {};
          (data.favorites || []).forEach((f) => {
            map[f.id] = true;
          });
          setFavoritesMap(map);
        }
      })
      .catch((err) => console.error('Error fetching favorites:', err));
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  // Fetch Documents whenever search, folder, sect, category, tag, filter, or page changes
  useEffect(() => {
    setIsLoadingDocs(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      folder: activeFolder,
      q: debouncedSearch,
      filter: activeFilter
    });

    if (activeFolderId && !activeFolder) {
      params.set('folder_id', activeFolderId.toString());
    }

    if (activeSect && activeSect !== 'all') {
      params.set('sect', activeSect);
    }

    if (activeCategory && activeCategory !== 'all') {
      params.set('category', activeCategory);
    }

    if (activeTag) {
      params.set('tag', activeTag);
    }

    fetch(`/api/documents?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocuments(data.documents || []);
          setSubfolders(data.subfolders || []);
          setTotalDocs(data.total || 0);
        }
        setIsLoadingDocs(false);
      })
      .catch((err) => {
        console.error('Error fetching documents:', err);
        setIsLoadingDocs(false);
      });
  }, [activeFolder, activeFolderId, debouncedSearch, activeSect, activeCategory, activeTag, activeFilter, page]);

  // Handle switching sects
  const handleSelectSect = (sect) => {
    setActiveSect(sect);
    setActiveFolder('');
    setActiveFolderId(null);
    setActiveFolderCategory(null);
    setActiveCategory('all');
    setActiveTag('');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  // Handle select folder from tree or breadcrumb
  const handleSelectFolder = (folderPath, folderId = null) => {
    setActiveFolder(folderPath);
    setActiveFolderId(folderId);
    setPage(1);


    if (folderId) {
      fetch(`/api/folder/${folderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.folder) {
            setActiveFolderCategory(data.folder.category || null);
            if (data.folder.sect && data.folder.sect !== activeSect) {
              setActiveSect(data.folder.sect);
            }
          }
        })
        .catch(() => {});
    } else {
      setActiveFolderCategory(null);
    }
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setActiveCategory('all');
    setActiveTag('');
    setActiveFilter('all');
    setPage(1);
  };

  // Copy Direct Link to Current Folder
  const handleCopyFolderLink = () => {
    if (!activeFolderId) return;
    const url = window.location.origin + buildRouteUrl({ sect: activeSect, folderId: activeFolderId });
    navigator.clipboard.writeText(url);
    setCopiedFolderLink(true);
    showToast('تم نسخ الرابط المباشر للقسم');
    setTimeout(() => setCopiedFolderLink(false), 2000);
  };

  // Set Folder Category (هجوم / إلزام / دفاع)
  const handleSetFolderCategory = (categoryKey) => {
    if (!activeFolderId) return;
    const newCat = activeFolderCategory === categoryKey ? null : categoryKey;

    fetch(`/api/folder/${activeFolderId}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCat, apply_to_docs: true })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveFolderCategory(newCat);
          fetchTreeAndStats();
          setPage(1);
          showToast(`تم تصنيف المجلد كـ ${newCat ? DEBATE_CATEGORIES[newCat].name : 'بدون تصنيف'}`);
        }
      })
      .catch((err) => console.error('Error updating folder category:', err));
  };

  // Toggle favorite (Debate Tray)
  const handleToggleFavorite = (docId) => {
    const isFav = !!favoritesMap[docId];
    const method = isFav ? 'DELETE' : 'POST';
    const url = isFav ? `/api/favorites/${docId}` : '/api/favorites';
    const body = isFav ? null : JSON.stringify({ document_id: docId });

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchFavorites();
          showToast(isFav ? 'تمت الإزالة من سلة البث' : 'تمت الإضافة إلى سلة البث والمناظرة 🔥');
        }
      })
      .catch((err) => console.error('Error updating favorite:', err));
  };

  const handleClearFavorites = () => {
    Promise.all(favorites.map((f) => fetch(`/api/favorites/${f.id}`, { method: 'DELETE' })))
      .then(() => {
        fetchFavorites();
        showToast('تم تفريغ سلة البث');
      })
      .catch((err) => console.error('Error clearing favorites:', err));
  };

  // Copy Image to Clipboard
  const handleCopyImage = async (doc) => {
    try {
      const imageUrl = `/api/image/raw?path=${encodeURIComponent(doc.full_path)}`;
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const objectUrl = URL.createObjectURL(blob);

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]);
            setCopiedDocId(doc.id);
            showToast('✅ تم نسخ الصورة للحافظة! جاهزة للصق في OBS أو البث');
            setTimeout(() => setCopiedDocId(null), 2500);
          } catch (e) {
            console.warn('Clipboard write error:', e);
            navigator.clipboard.writeText(window.location.origin + imageUrl);
            showToast('تم نسخ رابط الصورة');
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        });
      };
      img.src = objectUrl;
    } catch (e) {
      console.error('Error copying image:', e);
      showToast('تعذر نسخ الصورة');
    }
  };

  // Tag selection from any pill
  const handleSelectTag = (tag) => {
    setActiveTag((prev) => (prev === tag ? '' : tag));
    setPage(1);
  };

  // Rescan Trigger
  const handleRescan = () => {
    setIsScanning(true);
    fetch('/api/scan', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setIsScanning(false);
        if (data.success) {
          fetchTreeAndStats();
          showToast(`اكتمل الفحص: ${data.totalFiles} ملف مفهرس`);
        }
      })
      .catch((err) => {
        setIsScanning(false);
        console.error('Scan failed:', err);
      });
  };

  // Compute parent folder path for breadcrumbs
  const getParentFolderPath = (p) => {
    if (!p) return '';
    const parts = p.split(/[/\\\\]/);
    if (parts.length <= 1) return '';
    parts.pop();
    return parts.join('/');
  };

  const currentFolderCatMeta = activeFolderCategory ? DEBATE_CATEGORIES[activeFolderCategory] : null;

  return (
    <div className="min-h-screen flex flex-col transition-colors">

      {/* Bible Section — full-page takeover */}
      {isBibleView ? (
        <>
          {/* Slim header with back button */}
          <div className="sticky top-0 z-30 app-header shadow-sm">
            <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex items-center gap-3" dir="rtl">
              <button
                onClick={() => { setIsBibleView(false); window.history.pushState(null, '', buildRouteUrl({})); document.title = 'رفيق المحاور'; }}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-amber-500 transition-colors"
              >
                <Compass className="w-4 h-4" />
                رفيق المحاور
              </button>
              <div className="flex-1" />
              <button
                onClick={() => { const d = document.documentElement; d.classList.toggle('dark'); localStorage.setItem('app_theme', d.classList.contains('dark') ? 'dark' : 'light'); }}
                className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-amber-500 transition-colors text-xs"
                aria-label="تبديل المظهر"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          <BibleSection
            initialBook={initialRoute.bibleBook}
            initialChapter={initialRoute.bibleChapter}
            initialVerse={initialRoute.bibleVerse}
          />
        </>
      ) : (
        <>
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeFilter={activeFilter}
        setActiveFilter={(filter) => {
          setActiveFilter(filter);
          setPage(1);
        }}
        activeSect={activeSect}
        setActiveSect={handleSelectSect}
        activeCategory={activeCategory}

        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          setPage(1);
        }}
        sectsList={sectsList}
        theme={theme}
        onToggleTheme={toggleTheme}
        debateItemsCount={favorites.length}
        onOpenDebateTray={() => setIsDebateTrayOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCategoryGuide={() => setIsCategoryGuideOpen(true)}
        onRescan={handleRescan}
        isScanning={isScanning}
        stats={stats}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onOpenBible={() => { setIsBibleView(true); window.history.pushState(null, '', buildBibleUrl()); document.title = 'الكتاب المقدس - رفيق المحاور'; }}
      />


      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1920px] w-full mx-auto">
        
        {/* Sidebar Folder Hierarchy */}
        <SidebarTree
          treeData={treeData}
          activeFolder={activeFolder}
          onSelectFolder={(folderPath, id) => handleSelectFolder(folderPath, id)}
          totalDocsCount={stats?.totalDocuments}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Main Content Grid */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Active Filter / Folder / Tag Breadcrumbs Bar */}
          <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/30 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold">المسار:</span>
              
              {/* Sect indicator */}
              {activeSect && activeSect !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-xs">
                  <Compass className="w-3 h-3 text-amber-500" />
                  <span>{activeSect}</span>
                </span>
              )}

              {/* Breadcrumbs Root Button */}
              <button
                onClick={() => handleSelectFolder('')}
                className={`px-2.5 py-0.5 rounded-lg border transition-all text-xs btn-press font-bold ${
                  activeFolder === ''
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-amber-500'
                }`}
              >
                الرئيسية
              </button>

              {/* Folder Breadcrumbs */}
              {activeFolder && (
                <div className="flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                  
                  {/* Up to Parent Folder Button */}
                  {getParentFolderPath(activeFolder) && (
                    <>
                      <button
                        onClick={() => handleSelectFolder(getParentFolderPath(activeFolder))}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 btn-press text-xs font-bold"
                        title="المجلد الأعلى"
                      >
                        ..
                      </button>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </>
                  )}

                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 shadow-xs">
                    {currentFolderCatMeta ? (
                      <span className={currentFolderCatMeta.dotClass} title={`صنف المجلد: ${currentFolderCatMeta.name}`} />
                    ) : (
                      <Folder className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{activeFolder.split(/[/\\\\]/).pop()}</span>
                  </span>

                  {/* Copy Direct Link to Folder */}
                  {activeFolderId && (
                    <button
                      onClick={handleCopyFolderLink}
                      className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors btn-press"
                      title="نسخ الرابط المباشر لهذا المجلد"
                    >
                      {copiedFolderLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Link2 className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Classify Entire Folder Buttons */}
                  {activeFolderId && (
                    <div className="flex items-center gap-1 mr-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 px-1 font-medium">تصنيف المجلد:</span>
                      
                      <button
                        onClick={() => handleSetFolderCategory('attack')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 btn-press ${
                          activeFolderCategory === 'attack'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'hover:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                        title="تصنيف المجلد بالكامل كـ هجوم"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        هجوم
                      </button>

                      <button
                        onClick={() => handleSetFolderCategory('obligation')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 btn-press ${
                          activeFolderCategory === 'obligation'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'hover:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                        title="تصنيف المجلد بالكامل كـ إلزام"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        إلزام
                      </button>

                      <button
                        onClick={() => handleSetFolderCategory('defense')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 btn-press ${
                          activeFolderCategory === 'defense'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                        title="تصنيف المجلد بالكامل كـ دفاع"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        دفاع
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tag indicator */}
              {activeTag && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold shadow-xs text-xs">
                  <TagIcon className="w-3 h-3" />
                  <span>وسم: #{activeTag}</span>
                  <button
                    onClick={() => setActiveTag('')}
                    className="hover:bg-amber-600 rounded p-0.5"
                    title="إلغاء تصفية الوسم"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Search query indicator */}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold">
                  <span>بحث: "{debouncedSearch}"</span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:text-amber-900 dark:hover:text-amber-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Category indicator if filtered */}
              {activeCategory && activeCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <span className={DEBATE_CATEGORIES[activeCategory]?.dotClass} />
                  <span>صنف: {DEBATE_CATEGORIES[activeCategory]?.name}</span>
                  <button
                    onClick={() => setActiveCategory('all')}
                    className="hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Clear All Filters Button */}
              {(debouncedSearch || activeTag || (activeCategory && activeCategory !== 'all')) && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] underline font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إلغاء كل الفلاتر</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold font-mono">
              {totalDocs.toLocaleString('ar-EG')} وثيقة
            </div>
          </div>

          {/* Documents & Subfolders Grid View */}
          <DocumentGrid
            documents={documents}
            subfolders={subfolders}
            activeFolder={activeFolder}
            onSelectFolder={(folderPath, id) => handleSelectFolder(folderPath, id)}
            total={totalDocs}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onOpenDoc={(id) => setActiveDocId(id)}
            onToggleFavorite={handleToggleFavorite}
            onCopyImage={handleCopyImage}
            copiedDocId={copiedDocId}
            onOpenProjector={(doc) => setProjectorDoc(doc)}
            onSelectTag={handleSelectTag}
            favoritesMap={favoritesMap}
            isLoading={isLoadingDocs}
            activeCategory={activeCategory}
            onResetFilters={handleResetFilters}
            searchTerm={debouncedSearch}
            activeTag={activeTag}
          />
        </main>
      </div>

      {/* Document Inspector Modal */}
      {activeDocId && (
        <ImageViewerModal
          docId={activeDocId}
          searchQuery={debouncedSearch}
          onClose={() => setActiveDocId(null)}
          onNavigateDoc={(id) => setActiveDocId(id)}
          onToggleFavorite={handleToggleFavorite}
          onCopyImage={handleCopyImage}
          copiedDocId={copiedDocId}
          onOpenProjector={(doc) => setProjectorDoc(doc)}
          onSelectTag={handleSelectTag}
          isFavorite={!!favoritesMap[activeDocId]}
        />
      )}

      {/* Projector Fullscreen Window */}
      {projectorDoc && (
        <ProjectorView
          doc={projectorDoc}
          onClose={() => setProjectorDoc(null)}
          onCopyImage={handleCopyImage}
          copiedDocId={copiedDocId}
        />
      )}

      {/* Live Debate Dock / Tray */}
      <DebateTray
        isOpen={isDebateTrayOpen}
        onClose={() => setIsDebateTrayOpen(false)}
        favorites={favorites}
        onRemoveFavorite={(id) => handleToggleFavorite(id)}
        onClearFavorites={handleClearFavorites}
        onOpenDoc={(id) => setActiveDocId(id)}
        onCopyImage={handleCopyImage}
        copiedDocId={copiedDocId}
        onOpenProjector={(doc) => setProjectorDoc(doc)}
      />

      {/* Statistics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
      />

      {/* Category Guide Modal */}
      <CategoryGuideModal
        isOpen={isCategoryGuideOpen}
        onClose={() => setIsCategoryGuideOpen(false)}
      />

      {/* Floating Toast Notification (RTL start aligned, glassmorphic) */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 bg-slate-950/90 text-white dark:bg-white/95 dark:text-slate-950 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-slideUp flex items-center gap-2.5 border border-slate-800 dark:border-slate-200 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      </>
      )}

    </div>
  );
}

