import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getBookmarks,
  getBookmarkCategories,
  removeBookmark,
  getAllHighlights,
  getHighlightCategories,
  removeHighlight,
  reassignBookmarkCategory,
  reassignHighlightCategory,
} from "../api/api";
import { Bookmark, Highlight } from "../types";
import {
  Bookmark as BookmarkIcon,
  Trash2,
  Highlighter,
  Clock,
  Image as ImageIcon,
  ChevronLeft,
  LayoutGrid,
  List,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import QuoteModal from "../components/QuoteModal";
import ConfirmModal from "../components/ConfirmModal";

type ConfirmType = "bookmark" | "highlight" | null;
type TabType = "bookmarks" | "highlights";
// "default" = flat all-items list, "grid" = category grid, other string = inside a category
type ViewMode = "default" | "grid" | string;

export default function Bookmarks() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("bookmarks");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarkCategories, setBookmarkCategories] = useState<string[]>([]);
  const [highlightCategories, setHighlightCategories] = useState<string[]>([]);

  const [bookmarkView, setBookmarkView] = useState<ViewMode>("default");
  const [highlightView, setHighlightView] = useState<ViewMode>("default");

  const [activeQuote, setActiveQuote] = useState<Highlight | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmType; contId?: number; highlightId?: string }>({ type: null });
  const [deleteCategoryState, setDeleteCategoryState] = useState<{ tab: TabType; category: string } | null>(null);

  useEffect(() => { reload(); }, []);

  const reload = () => {
    setBookmarks(getBookmarks());
    setHighlights(getAllHighlights());
    setBookmarkCategories(getBookmarkCategories());
    setHighlightCategories(getHighlightCategories());
  };

  const currentView = tab === "bookmarks" ? bookmarkView : highlightView;
  const setCurrentView = (v: ViewMode) => {
    if (tab === "bookmarks") setBookmarkView(v);
    else setHighlightView(v);
  };

  // Use a ref so the swipe handler always reads the latest state without stale closures
  const swipeStateRef = useRef({ currentView, tab, bookmarkCategories, highlightCategories });
  swipeStateRef.current = { currentView, tab, bookmarkCategories, highlightCategories };
  const setCurrentViewRef = useRef(setCurrentView);
  setCurrentViewRef.current = setCurrentView;

  useEffect(() => {
    const THRESHOLD = 60;
    const ANGLE_RATIO = 1.5;
    let startX = 0, startY = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * ANGLE_RATIO) return;

      const { currentView: cv, bookmarkCategories: bCats, highlightCategories: hCats } = swipeStateRef.current;
      const cats = swipeStateRef.current.tab === "bookmarks" ? bCats : hCats;
      const isDetail = cv !== "default" && cv !== "grid";
      const hasCategories = cats.length > 0;

      if (dx > 0) {
        // Right swipe
        if (cv === "grid") {
          setCurrentViewRef.current("default");
        } else if (cv === "default" && startX < 60) {
          // Left-edge right-swipe → leave the page
          navigate(-1);
        }
      } else {
        // Left swipe
        if (isDetail) {
          // Inside a category → left swipe goes back to the grid
          setCurrentViewRef.current("grid");
        } else if (cv === "default" && hasCategories) {
          setCurrentViewRef.current("grid");
        }
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [navigate]);

  // Items for the current view (filtered by selected category if in detail mode)
  const isDetail = currentView !== "default" && currentView !== "grid";
  const filteredBookmarks = isDetail
    ? bookmarks.filter((b) => b.category === currentView)
    : bookmarks;
  const filteredHighlights = isDetail
    ? highlights.filter((h) => (h.category || "Highlights") === currentView)
    : highlights;

  // Category data with cover / preview
  const namedBookmarkCats = bookmarkCategories.map((cat) => {
    const items = bookmarks.filter((b) => b.category === cat);
    const cover = items.find((b) => b.article.pic || b.article.appHeadPic)?.article;
    return { name: cat, count: items.length, cover: cover?.pic || cover?.appHeadPic };
  });
  const namedHighlightCats = highlightCategories.map((cat) => {
    const items = highlights.filter((h) => (h.category || "Highlights") === cat);
    return { name: cat, count: items.length, preview: items[0]?.text };
  });

  const handleRemoveBookmark = (e: React.MouseEvent, contId: number) => {
    e.preventDefault(); e.stopPropagation();
    setConfirmState({ type: "bookmark", contId });
  };
  const handleRemoveHighlight = (e: React.MouseEvent, contId: number, highlightId: string) => {
    e.preventDefault(); e.stopPropagation();
    setConfirmState({ type: "highlight", contId, highlightId });
  };
  const onConfirmRemove = () => {
    if (confirmState.type === "bookmark" && confirmState.contId != null) {
      removeBookmark(confirmState.contId); reload();
    } else if (confirmState.type === "highlight" && confirmState.contId != null && confirmState.highlightId) {
      removeHighlight(confirmState.contId, confirmState.highlightId); reload();
    }
    setConfirmState({ type: null });
  };
  const onConfirmDeleteCategory = () => {
    if (!deleteCategoryState) return;
    if (deleteCategoryState.tab === "bookmarks") {
      reassignBookmarkCategory(deleteCategoryState.category);
      if (bookmarkView === deleteCategoryState.category) setBookmarkView("grid");
    } else {
      reassignHighlightCategory(deleteCategoryState.category);
      if (highlightView === deleteCategoryState.category) setHighlightView("grid");
    }
    reload();
    setDeleteCategoryState(null);
  };

  const timeAgo = (ts: number) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
  };

  const isEmpty = tab === "bookmarks" ? bookmarks.length === 0 : highlights.length === 0;
  const hasCategories = tab === "bookmarks" ? bookmarkCategories.length > 0 : highlightCategories.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-px w-6 bg-brand" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-brand uppercase">Library</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight">Collected</h1>
      </div>

      {/* Bookmarks / Highlights tab */}
      <div className="flex rounded-2xl bg-gray-100 p-1 mb-4">
        <button type="button" onClick={() => setTab("bookmarks")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "bookmarks" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
        </button>
        <button type="button" onClick={() => setTab("highlights")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "highlights" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          Highlights {highlights.length > 0 && `(${highlights.length})`}
        </button>
      </div>

      {/* Default / Categories sub-view switcher */}
      {!isEmpty && hasCategories && !isDetail && (
        <div className="flex gap-2 mb-5">
          <button type="button" onClick={() => setCurrentView("default")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              currentView === "default" ? "bg-gray-900 text-white shadow" : "bg-white border border-gray-100 text-gray-400 hover:text-gray-700 hover:border-gray-300"
            }`}>
            <List size={13} />
            Default
          </button>
          <button type="button" onClick={() => setCurrentView("grid")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              currentView === "grid" ? "bg-gray-900 text-white shadow" : "bg-white border border-gray-100 text-gray-400 hover:text-gray-700 hover:border-gray-300"
            }`}>
            <LayoutGrid size={13} />
            Categories
          </button>
        </div>
      )}

      {/* Inside-category header (back button + category name) */}
      {isDetail && (
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setCurrentView("grid")}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-brand hover:border-brand/30 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-brand uppercase tracking-widest">Category</p>
            <h2 className="text-lg font-bold text-gray-900 truncate">{currentView}</h2>
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {tab === "bookmarks" ? filteredBookmarks.length : filteredHighlights.length} items
          </span>
        </div>
      )}

      {/* Empty states */}
      {isEmpty && tab === "bookmarks" && (
        <div className="text-center py-32 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
            <BookmarkIcon size={32} className="text-gray-200" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">No bookmarks yet</h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Save articles to your collection from the article page.</p>
        </div>
      )}
      {isEmpty && tab === "highlights" && (
        <div className="text-center py-32 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
            <Highlighter size={32} className="text-gray-200" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">No highlights yet</h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Select text in an article and tap Highlight to save quotes.</p>
        </div>
      )}

      {/* ── Category grid view ── */}
      <AnimatePresence mode="wait">
        {!isEmpty && currentView === "grid" && (
          <motion.div key="grid" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
            {tab === "bookmarks" && (
              <div className="grid grid-cols-2 gap-3">
                {namedBookmarkCats.map((cat) => (
                  <div key={cat.name} className="relative rounded-2xl overflow-hidden min-h-[140px] cursor-pointer group"
                    onClick={() => setBookmarkView(cat.name)}>
                    {/* Background */}
                    {cat.cover ? (
                      <>
                        <img src={cat.cover} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50" />
                    )}
                    {/* Delete btn */}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteCategoryState({ tab: "bookmarks", category: cat.name }); }}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-red-500 text-white/70 hover:text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className={`text-sm font-bold leading-snug truncate ${cat.cover ? "text-white" : "text-gray-900"}`}>{cat.name}</p>
                      <p className={`text-xs mt-0.5 ${cat.cover ? "text-white/60" : "text-gray-400"}`}>{cat.count} {cat.count === 1 ? "item" : "items"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "highlights" && (
              <div className="grid grid-cols-2 gap-3">
                {namedHighlightCats.map((cat) => (
                  <div key={cat.name}
                    className="relative rounded-2xl overflow-hidden min-h-[140px] bg-white border border-gray-100 cursor-pointer group hover:shadow-md hover:border-brand/20 transition-all p-4 flex flex-col"
                    onClick={() => setHighlightView(cat.name)}>
                    {/* Delete btn */}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteCategoryState({ tab: "highlights", category: cat.name }); }}
                      className="absolute top-2 right-2 p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                    {/* Preview quote */}
                    {cat.preview && (
                      <p className="text-xs text-gray-400 font-serif italic line-clamp-3 flex-1 mb-2 leading-relaxed">
                        &ldquo;{cat.preview}&rdquo;
                      </p>
                    )}
                    <div className="mt-auto">
                      <p className="text-sm font-bold text-gray-900 truncate">{cat.name}</p>
                      <p className="text-xs text-brand/60 mt-0.5">{cat.count} {cat.count === 1 ? "highlight" : "highlights"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Flat list (default or inside-category) ── */}
        {!isEmpty && currentView !== "grid" && (
          <motion.div key={`list-${currentView}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
            {/* Empty inside category */}
            {isDetail && tab === "bookmarks" && filteredBookmarks.length === 0 && (
              <div className="text-center py-20 text-gray-400 text-sm">No bookmarks in this category.</div>
            )}
            {isDetail && tab === "highlights" && filteredHighlights.length === 0 && (
              <div className="text-center py-20 text-gray-400 text-sm">No highlights in this category.</div>
            )}

            <div className="space-y-3">
              {tab === "bookmarks" && filteredBookmarks.map((bookmark, index) => (
                <motion.div key={bookmark.article.contId}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden">
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Clock size={10} className="shrink-0" />
                      <span>{timeAgo(bookmark.CollectedAt)}</span>
                    </div>
                    <button onClick={(e) => handleRemoveBookmark(e, bookmark.article.contId)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" aria-label="Remove bookmark">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Link to={`/article/${bookmark.article.contId}`} className="flex items-center gap-3 px-3 pb-3 pt-0 group">
                    <img src={bookmark.article.pic || bookmark.article.appHeadPic} alt={bookmark.article.name}
                      className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100" loading="lazy" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-brand transition-colors">
                        {bookmark.article.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-gray-400">
                        {bookmark.article.userInfo && (
                          <><span>{bookmark.article.userInfo.name}</span><span className="text-gray-200">·</span></>
                        )}
                        {bookmark.category && <span className="text-brand font-semibold">{bookmark.category}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {tab === "highlights" && filteredHighlights.map((h, index) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                  <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock size={10} className="shrink-0" />
                        <span>{timeAgo(h.createdAt)}</span>
                        {h.category && (
                          <><span className="text-gray-200">·</span><span className="text-brand font-semibold">{h.category}</span></>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        <button onClick={() => setActiveQuote(h)}
                          className="p-1.5 text-gray-300 hover:text-brand transition-colors rounded-full hover:bg-brand/5" title="Generate Quote Image">
                          <ImageIcon size={14} />
                        </button>
                        <button onClick={(e) => handleRemoveHighlight(e, h.contId, h.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" title="Remove Highlight">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <Link to={`/article/${h.contId}`} className="block px-4 pb-4 pt-0">
                      <div className="relative pl-8">
                        <span className="absolute left-0 top-0 text-3xl font-serif text-brand/25 leading-none select-none" aria-hidden>&ldquo;</span>
                        <p className="text-sm text-gray-700 font-serif leading-relaxed italic line-clamp-3">{h.text}</p>
                        {h.thought && <p className="text-sm text-gray-500 mt-2 line-clamp-2">&mdash; {h.thought}</p>}
                        <span className="text-[11px] text-brand font-medium mt-2 block">{h.articleName || "Unknown article"}</span>
                      </div>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeQuote && (
        <QuoteModal text={activeQuote.text} articleTitle={activeQuote.articleName || "Unknown article"}
          author="Seventh Tone" onClose={() => setActiveQuote(null)} />
      )}

      <ConfirmModal open={confirmState.type === "bookmark"} onClose={() => setConfirmState({ type: null })}
        onConfirm={onConfirmRemove} title="Remove from bookmarks?"
        message="This article will be removed from your collection. You can bookmark it again anytime."
        confirmLabel="Remove" variant="danger" />
      <ConfirmModal open={confirmState.type === "highlight"} onClose={() => setConfirmState({ type: null })}
        onConfirm={onConfirmRemove} title="Remove this highlight?"
        message="This highlight will be deleted and cannot be restored."
        confirmLabel="Remove" variant="danger" />
      <ConfirmModal open={deleteCategoryState !== null} onClose={() => setDeleteCategoryState(null)}
        onConfirm={onConfirmDeleteCategory}
        title={deleteCategoryState ? `Remove category "${deleteCategoryState.category}"?` : ""}
        message="Items in this category will lose their category tag and remain accessible under Default."
        confirmLabel="Remove" variant="danger" />
    </motion.div>
  );
}
