import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getBookmarks, getBookmarkCategories, removeBookmark, getAllHighlights, removeHighlight } from "../api/api";
import { Bookmark, Highlight } from "../types";
import { Bookmark as BookmarkIcon, Trash2, Highlighter, Clock, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import QuoteModal from "../components/QuoteModal";
import ConfirmModal from "../components/ConfirmModal";

type ConfirmType = "bookmark" | "highlight" | null;

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeQuote, setActiveQuote] = useState<Highlight | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmType; contId?: number; highlightId?: string }>({ type: null });
  const touchStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const SWIPE_THRESHOLD = 50;
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStart.current.x;
      const dy = endY - touchStart.current.y;
      if (categories.length <= 1) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const idx = categories.indexOf(activeCategory);
      if (idx === -1) return;
      if (dx > 0 && idx > 0) {
        setActiveCategory(categories[idx - 1]);
      } else if (dx < 0 && idx < categories.length - 1) {
        setActiveCategory(categories[idx + 1]);
      }
    };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [categories, activeCategory]);

  const reload = () => {
    const bms = getBookmarks();
    setBookmarks(bms);

    const allH = getAllHighlights();
    setHighlights(allH);

    const cats = getBookmarkCategories();
    setCategories(["All", ...cats, "Highlights"]);
  };

  const handleRemoveBookmark = (e: React.MouseEvent, contId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmState({ type: "bookmark", contId });
  };

  const handleRemoveHighlight = (e: React.MouseEvent, contId: number, highlightId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmState({ type: "highlight", contId, highlightId });
  };

  const onConfirmRemove = () => {
    if (confirmState.type === "bookmark" && confirmState.contId != null) {
      removeBookmark(confirmState.contId);
      reload();
    } else if (confirmState.type === "highlight" && confirmState.contId != null && confirmState.highlightId) {
      removeHighlight(confirmState.contId, confirmState.highlightId);
      reload();
    }
    setConfirmState({ type: null });
  };

  const filteredBookmarks =
    activeCategory === "Highlights" ? [] : activeCategory === "All" ? bookmarks : bookmarks.filter((b) => b.category === activeCategory);

  const showHighlights = activeCategory === "Highlights";

  const timeAgo = (ts: number) => {
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-px w-6 bg-brand"></span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-brand uppercase">Library</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight">Collected</h1>
      </div>

      {categories.length > 1 && (
        <div className="flex overflow-x-auto pb-4 mb-4 hide-scrollbar space-x-2.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-gray-900 text-white shadow-lg"
                  : "bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {cat === "Highlights" ? `Highlights (${highlights.length})` : cat}
            </button>
          ))}
        </div>
      )}

      {bookmarks.length === 0 && highlights.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
            <BookmarkIcon size={32} className="text-gray-200" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Nothing Collected yet</h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Bookmark articles or highlight sentences to collect them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bookmark articles */}
          {activeCategory !== "Highlights" &&
            filteredBookmarks.map((bookmark, index) => (
              <motion.div
                key={bookmark.article.contId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden"
              >
                {/* 上方一行：时间 + 删除 */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Clock size={10} className="shrink-0" />
                    <span>{timeAgo(bookmark.CollectedAt)}</span>
                  </div>
                  <button
                    onClick={(e) => handleRemoveBookmark(e, bookmark.article.contId)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                    aria-label="Remove bookmark"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <Link to={`/article/${bookmark.article.contId}`} className="flex items-center gap-3 px-3 pb-3 pt-0 group">
                  <img
                    src={bookmark.article.pic || bookmark.article.appHeadPic}
                    alt={bookmark.article.name}
                    className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-brand transition-colors">
                      {bookmark.article.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-gray-400">
                      {bookmark.article.userInfo && (
                        <>
                          <span>{bookmark.article.userInfo.name}</span>
                          <span className="text-gray-200">·</span>
                        </>
                      )}
                      <span className="text-brand font-semibold">{bookmark.category}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

          {/* Highlights：仅在 Highlights 分类下展示 */}
          {showHighlights && highlights.length > 0 && (
            highlights.map((h, index) => (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Clock size={10} className="shrink-0" />
                      <span>{timeAgo(h.createdAt)}</span>
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => setActiveQuote(h)}
                        className="p-1.5 text-gray-300 hover:text-brand transition-colors rounded-full hover:bg-brand/5"
                        title="Generate Quote Image"
                      >
                        <ImageIcon size={14} />
                      </button>
                      <button
                        onClick={(e) => handleRemoveHighlight(e, h.contId, h.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                        title="Remove Highlight"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <Link to={`/article/${h.contId}`} className="block px-4 pb-4 pt-0">
                    <div className="relative pl-8">
                      <span className="absolute left-0 top-0 text-3xl font-serif text-brand/25 leading-none select-none" aria-hidden>&ldquo;</span>
                      <p className="text-sm text-gray-700 font-serif leading-relaxed italic line-clamp-3">
                        {h.text}
                      </p>
                      <span className="text-[11px] text-brand font-medium mt-2 block">{h.articleName || "Unknown article"}</span>
                    </div>
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeQuote && (
        <QuoteModal
          text={activeQuote.text}
          articleTitle={activeQuote.articleName || "Unknown article"}
          author="Seventh Tone"
          onClose={() => setActiveQuote(null)}
        />
      )}

      <ConfirmModal
        open={confirmState.type === "bookmark"}
        onClose={() => setConfirmState({ type: null })}
        onConfirm={onConfirmRemove}
        title="Remove from bookmarks?"
        message="This article will be removed from your collection. You can bookmark it again anytime."
        confirmLabel="Remove"
        variant="danger"
      />
      <ConfirmModal
        open={confirmState.type === "highlight"}
        onClose={() => setConfirmState({ type: null })}
        onConfirm={onConfirmRemove}
        title="Remove this highlight?"
        message="This highlight will be deleted and cannot be restored."
        confirmLabel="Remove"
        variant="danger"
      />
    </motion.div>
  );
}
