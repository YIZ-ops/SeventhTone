import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import {
  getBookmarks,
  getBookmarkCategories,
  removeBookmark,
  getAllHighlights,
  getHighlightCategories,
  removeHighlight,
  deleteBookmarkCategory,
  deleteHighlightCategory,
  renameBookmarkCategory,
  renameHighlightCategory,
  getVocab,
  removeVocab,
} from "../api/api";
import { Bookmark, Highlight, VocabWord } from "../types";
import {
  Bookmark as BookmarkIcon,
  Trash2,
  Highlighter,
  Image as ImageIcon,
  ChevronLeft,
  BookOpen,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import QuoteModal from "../components/QuoteModal";
import ConfirmModal from "../components/ConfirmModal";

type ConfirmType = "bookmark" | "highlight" | "vocab" | null;
type TabType = "bookmarks" | "highlights" | "vocabulary";
// "default" = flat all-items list, "grid" = category grid, other string = inside a category
type ViewMode = "default" | "grid" | string;

// ── 滑动删除组件 ──────────────────────────────────────────────────────────────
function SwipeRow({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHRef = useRef<boolean | null>(null);
  const baseOffsetRef = useRef(0);
  const REVEAL = 76;
  const TRIGGER = 36;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHRef.current = null;
    baseOffsetRef.current = offset;
    setAnimating(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    if (isHRef.current === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      isHRef.current = Math.abs(dx) >= Math.abs(dy);
    }
    if (!isHRef.current) return;
    // 阻止上层页面的滑动切换 tab 逻辑
    e.stopPropagation();
    (e.nativeEvent as TouchEvent).stopImmediatePropagation?.();
    setOffset(Math.min(0, Math.max(-REVEAL, baseOffsetRef.current + dx)));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isHRef.current === true) {
      e.stopPropagation();
      (e.nativeEvent as TouchEvent).stopImmediatePropagation?.();
    }
    isHRef.current = null;
    setAnimating(true);
    const snap = offset < -TRIGGER ? -REVEAL : 0;
    setOffset(snap);
    baseOffsetRef.current = snap;
  };

  const close = () => {
    setAnimating(true);
    setOffset(0);
    baseOffsetRef.current = 0;
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-600"
      onClick={() => { if (offset < 0) close(); }}
    >
      {/* 滑动露出的删除按钮 */}
      <div className="absolute inset-y-0 right-0 w-[76px] bg-red-500 flex flex-col items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex flex-col items-center gap-0.5 text-white w-full h-full justify-center"
        >
          <Trash2 size={18} />
          <span className="text-[10px] font-bold">Remove</span>
        </button>
      </div>
      {/* 条目内容（可左滑） */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 0.18s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (dayStart === todayStart) return "Today";
  if (dayStart === todayStart - 86400000) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function groupByDay<T>(items: T[], getTs: (item: T) => number): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    const label = formatDayLabel(getTs(item));
    if (seen.has(label)) {
      groups[seen.get(label)!].items.push(item);
    } else {
      seen.set(label, groups.length);
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export default function Bookmarks() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("bookmarks");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [bookmarkCategories, setBookmarkCategories] = useState<string[]>([]);
  const [highlightCategories, setHighlightCategories] = useState<string[]>([]);

  const [bookmarkView, setBookmarkView] = useState<ViewMode>("grid");
  const [highlightView, setHighlightView] = useState<ViewMode>("grid");

  const [activeQuote, setActiveQuote] = useState<Highlight | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmType; contId?: number; highlightId?: string; vocabId?: string }>({ type: null });
  const [deleteCategoryState, setDeleteCategoryState] = useState<{ tab: TabType; category: string } | null>(null);
  const [renameCategoryState, setRenameCategoryState] = useState<{ tab: TabType; category: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  useEffect(() => { reload(); }, []);

  const reload = () => {
    setBookmarks(getBookmarks());
    setHighlights(getAllHighlights());
    setVocab(getVocab());
    setBookmarkCategories(getBookmarkCategories());
    setHighlightCategories(getHighlightCategories());
  };

  const currentView = tab === "bookmarks" ? bookmarkView : tab === "highlights" ? highlightView : "default";
  const setCurrentView = (v: ViewMode) => {
    if (tab === "bookmarks") setBookmarkView(v);
    else if (tab === "highlights") setHighlightView(v);
  };

  const TAB_ORDER: TabType[] = ["bookmarks", "highlights", "vocabulary"];

  // Use refs so swipe/back handlers always read latest state without stale closures
  const swipeStateRef = useRef({ currentView, tab });
  swipeStateRef.current = { currentView, tab };
  const setCurrentViewRef = useRef(setCurrentView);
  setCurrentViewRef.current = setCurrentView;
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;

  // Android 物理返回键：分类详情 → 分类格；其他直接返回首页
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let handle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", () => {
      const { currentView: cv, tab: t } = swipeStateRef.current;
      const isInDetail = cv !== "default" && cv !== "grid";
      if (isInDetail) {
        if (t === "bookmarks") setBookmarkView("grid");
        else if (t === "highlights") setHighlightView("grid");
      } else {
        navigate("/");
      }
    }).then((h) => { handle = h; });
    return () => { handle?.remove?.(); };
  }, [navigate]);

  // 滑动手势：
  //   - 在分类详情：右滑返回分类格
  //   - 在分类格 / 生词本列表：左右滑切换收藏文章 ↔ 句库 ↔ 生词本
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

      const { currentView: cv, tab: t } = swipeStateRef.current;
      const isDetail = cv !== "default" && cv !== "grid";
      const tabIdx = TAB_ORDER.indexOf(t as TabType);

      if (isDetail) {
        // 分类详情内：只支持右滑返回分类格
        if (dx > 0) setCurrentViewRef.current("grid");
      } else {
        // 分类格 / 生词本列表：左右切 tab
        if (dx > 0 && tabIdx > 0) {
          setTabRef.current(TAB_ORDER[tabIdx - 1]);
        } else if (dx < 0 && tabIdx < TAB_ORDER.length - 1) {
          setTabRef.current(TAB_ORDER[tabIdx + 1]);
        }
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

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

  const onConfirmRemove = () => {
    if (confirmState.type === "bookmark" && confirmState.contId != null) {
      removeBookmark(confirmState.contId); reload();
    } else if (confirmState.type === "highlight" && confirmState.contId != null && confirmState.highlightId) {
      removeHighlight(confirmState.contId, confirmState.highlightId); reload();
    } else if (confirmState.type === "vocab" && confirmState.vocabId) {
      removeVocab(confirmState.vocabId); reload();
    }
    setConfirmState({ type: null });
  };
  const onConfirmDeleteCategory = () => {
    if (!deleteCategoryState) return;
    if (deleteCategoryState.tab === "bookmarks") {
      deleteBookmarkCategory(deleteCategoryState.category);
      if (bookmarkView === deleteCategoryState.category) setBookmarkView("grid");
    } else {
      deleteHighlightCategory(deleteCategoryState.category);
      if (highlightView === deleteCategoryState.category) setHighlightView("grid");
    }
    reload();
    setDeleteCategoryState(null);
  };

  const openRename = (t: TabType, category: string) => {
    setRenameCategoryState({ tab: t, category });
    setRenameInput(category);
  };

  const onConfirmRenameCategory = () => {
    if (!renameCategoryState) return;
    const newName = renameInput.trim();
    if (!newName || newName === renameCategoryState.category) {
      setRenameCategoryState(null);
      return;
    }
    if (renameCategoryState.tab === "bookmarks") {
      renameBookmarkCategory(renameCategoryState.category, newName);
      if (bookmarkView === renameCategoryState.category) setBookmarkView(newName);
    } else {
      renameHighlightCategory(renameCategoryState.category, newName);
      if (highlightView === renameCategoryState.category) setHighlightView(newName);
    }
    reload();
    setRenameCategoryState(null);
  };

  const groupedBookmarks: { label: string; items: Bookmark[] }[] = groupByDay(filteredBookmarks, (b) => b.CollectedAt);
  const groupedHighlights: { label: string; items: Highlight[] }[] = groupByDay(filteredHighlights, (h) => h.createdAt);
  const groupedVocab: { label: string; items: VocabWord[] }[] = groupByDay(vocab, (v) => v.addedAt);

  const isEmpty =
    tab === "bookmarks" ? bookmarks.length === 0 :
    tab === "highlights" ? highlights.length === 0 :
    vocab.length === 0;
  const hasCategories =
    tab === "bookmarks" ? bookmarkCategories.length > 0 :
    tab === "highlights" ? highlightCategories.length > 0 :
    false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-px w-6 bg-brand dark:bg-emerald-400" />
          <span className="text-[10px] font-extrabold tracking-[0.3em] text-brand dark:text-emerald-400 uppercase">Library</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight">Collected</h1>
      </div>

      {/* 三个 tab：收藏文章 / 句库 / 生词本 */}
      <div className="flex rounded-2xl bg-gray-100 dark:bg-slate-700/50 p-1 mb-4">
        {(["bookmarks", "highlights", "vocabulary"] as TabType[]).map((t) => {
          const labels: Record<TabType, string> = { bookmarks: "News", highlights: "Highlights", vocabulary: "Vocabulary" };
          const counts: Record<TabType, number> = { bookmarks: bookmarks.length, highlights: highlights.length, vocabulary: vocab.length };
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === t ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {labels[t]}{counts[t] > 0 ? ` (${counts[t]})` : ""}
            </button>
          );
        })}
      </div>


      {/* Inside-category header (back button + category name) */}
      {isDetail && tab !== "vocabulary" && (
        <div className="flex items-center gap-1 mb-5">
          <button 
            type="button" 
            onClick={() => setCurrentView("grid")}
            className="flex items-center justify-center p-0 text-gray-600 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentView}</h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {tab === "bookmarks" ? filteredBookmarks.length : filteredHighlights.length} items
          </span>
        </div>
      )}

      {/* Empty states */}
      {isEmpty && tab === "bookmarks" && (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <BookmarkIcon size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">No saved articles</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Click the bookmark button on an article to save it here.</p>
        </div>
      )}
      {isEmpty && tab === "highlights" && (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <Highlighter size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">No highlights</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Select text in an article and click "Highlight" to save it here.</p>
        </div>
      )}
      {isEmpty && tab === "vocabulary" && (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <BookOpen size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">Vocabulary is empty</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Tap a word in an article to view its definition, and click <span className="text-brand">+</span> to add it here.</p>
        </div>
      )}

      {/* ── Category grid view ── */}
      <AnimatePresence mode="wait">
        {tab !== "vocabulary" && !isEmpty && currentView === "grid" && (
          <motion.div key="grid" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
            {tab === "bookmarks" && (
              <div className="grid grid-cols-2 gap-3">
                {namedBookmarkCats.map((cat) => (
                  <div key={cat.name} className="relative rounded-2xl overflow-hidden min-h-[140px] cursor-pointer group"
                    onClick={() => setBookmarkView(cat.name)}>
                    {cat.cover ? (
                      <>
                        <img src={cat.cover} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-700 dark:to-slate-800" />
                    )}
                    {/* 操作按钮：重命名 + 删除 */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); openRename("bookmarks", cat.name); }}
                        className="p-1.5 rounded-full bg-black/25 text-white/80 hover:bg-white/30 hover:text-white transition-all backdrop-blur-sm">
                        <Pencil size={11} />
                      </button>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteCategoryState({ tab: "bookmarks", category: cat.name }); }}
                        className="p-1.5 rounded-full bg-black/25 text-white/80 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className={`text-sm font-bold leading-snug truncate ${cat.cover ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{cat.name}</p>
                      <p className={`text-xs mt-0.5 ${cat.cover ? "text-white/60" : "text-gray-400 dark:text-gray-500"}`}>{cat.count} {cat.count === 1 ? "item" : "items"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "highlights" && (
              <div className="grid grid-cols-2 gap-3">
                {namedHighlightCats.map((cat) => (
                  <div key={cat.name}
                    className="relative rounded-2xl overflow-hidden min-h-[140px] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 cursor-pointer group hover:shadow-md hover:border-brand/20 dark:hover:border-emerald-500/30 transition-all p-4 flex flex-col"
                    onClick={() => setHighlightView(cat.name)}>
                    {/* 操作按钮：重命名 + 删除 */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); openRename("highlights", cat.name); }}
                        className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-brand/10 hover:text-brand dark:hover:text-emerald-400 transition-all">
                        <Pencil size={11} />
                      </button>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteCategoryState({ tab: "highlights", category: cat.name }); }}
                        className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {cat.preview && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-serif italic line-clamp-3 flex-1 mb-2 leading-relaxed pr-14">
                        &ldquo;{cat.preview}&rdquo;
                      </p>
                    )}
                    <div className="mt-auto">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{cat.name}</p>
                      <p className="text-xs text-brand/60 dark:text-emerald-400/70 mt-0.5">{cat.count} {cat.count === 1 ? "highlight" : "highlights"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── 分类内列表（按天分组）── */}
        {tab !== "vocabulary" && !isEmpty && currentView !== "grid" && (
          <motion.div key={`list-${currentView}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
            {isDetail && tab === "bookmarks" && filteredBookmarks.length === 0 && (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">This Category is empty.</div>
            )}
            {isDetail && tab === "highlights" && filteredHighlights.length === 0 && (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">This Category is empty.</div>
            )}

            {tab === "bookmarks" && groupedBookmarks.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((bookmark, index) => (
                    <motion.div key={bookmark.article.contId}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <SwipeRow onDelete={() => setConfirmState({ type: "bookmark", contId: bookmark.article.contId })}>
                        <Link to={`/article/${bookmark.article.contId}`} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 group hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
                          <img src={bookmark.article.pic || bookmark.article.appHeadPic} alt={bookmark.article.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-slate-700" loading="lazy" referrerPolicy="no-referrer" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors">
                              {bookmark.article.name}
                            </h3>
                            {bookmark.article.userInfo && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{bookmark.article.userInfo.name}</p>
                            )}
                          </div>
                        </Link>
                      </SwipeRow>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {tab === "highlights" && groupedHighlights.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((h, index) => (
                    <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <SwipeRow onDelete={() => setConfirmState({ type: "highlight", contId: h.contId, highlightId: h.id })}>
                        <div className="relative bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
                          {/* 生成书摘图片按钮 */}
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveQuote(h); }}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-gray-500 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10 transition-colors z-10"
                            title="Generate quote image"
                          >
                            <ImageIcon size={14} />
                          </button>
                          <Link to={`/article/${h.contId}`} className="block px-4 py-4 pr-10">
                            <div className="relative pl-7">
                              <span className="absolute left-0 top-0 text-2xl font-serif text-brand/20 dark:text-emerald-400/20 leading-none select-none" aria-hidden>&ldquo;</span>
                              <p className="text-sm text-gray-700 dark:text-gray-200 font-serif leading-relaxed italic line-clamp-3">{h.text}</p>
                              {h.thought && <p className="text-s text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{h.thought}</p>}
                              <span className="text-[11px] text-brand dark:text-emerald-400 font-medium mt-2 block truncate">{h.articleName || "Unknown article"}</span>
                            </div>
                          </Link>
                        </div>
                      </SwipeRow>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── 生词本列表（按天分组）── */}
        {tab === "vocabulary" && !isEmpty && (
          <motion.div key="vocab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
            {groupedVocab.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((v, index) => (
                    <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                      <SwipeRow onDelete={() => setConfirmState({ type: "vocab", vocabId: v.id })}>
                        <div className="bg-white dark:bg-slate-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-bold text-gray-900 dark:text-gray-100">{v.word}</span>
                            {v.phonetic && (
                              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">/{v.phonetic}/</span>
                            )}
                          </div>
                          {v.translations.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {v.translations.join("；")}
                            </p>
                          )}
                        </div>
                      </SwipeRow>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
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
      <ConfirmModal open={confirmState.type === "vocab"} onClose={() => setConfirmState({ type: null })}
        onConfirm={onConfirmRemove} title="Remove from vocabulary?"
        message="This word will be removed from your vocabulary."
        confirmLabel="Remove" variant="danger" />
      <ConfirmModal open={deleteCategoryState !== null} onClose={() => setDeleteCategoryState(null)}
        onConfirm={onConfirmDeleteCategory}
        title={deleteCategoryState ? `Delete category "${deleteCategoryState.category}"?` : ""}
        message="All items in this category will be permanently deleted and cannot be recovered."
        confirmLabel="Delete" variant="danger" />

      {/* Rename category dialog */}
      {renameCategoryState && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenameCategoryState(null)} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Rename Category</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Current: {renameCategoryState.category}</p>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onConfirmRenameCategory(); if (e.key === "Escape") setRenameCategoryState(null); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-emerald-500 focus:border-transparent mb-4"
              placeholder="Enter new category name"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRenameCategoryState(null)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={14} /> Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmRenameCategory}
                disabled={!renameInput.trim() || renameInput.trim() === renameCategoryState.category}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-brand/90 dark:hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={14} /> Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
