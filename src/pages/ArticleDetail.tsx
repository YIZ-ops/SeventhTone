import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArticleDetail, addHistory, addBookmark, getBookmarks, removeBookmark, getHighlights, addHighlight, removeHighlight, updateHighlight } from "../api/api";
import { ArticleDetail, Highlight } from "../types";
import DOMPurify from "dompurify";
import Mark from "mark.js";
import { ChevronLeft, Loader2, Clock, Bookmark, BookmarkCheck, Highlighter } from "lucide-react";
import BookmarkModal from "../components/BookmarkModal";
import HighlightSaveModal from "../components/HighlightSaveModal";
import HighlightDetailModal from "../components/HighlightDetailModal";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function ArticleDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useSwipeBack();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string } | null>(null);
  // activeHighlight is set directly in handleMarkClick (not via an intermediate
  // activeHighlightId) so that the scroll-dismiss handler never holds a reference
  // to it — keyboard appearance causes a scroll event that would otherwise clear
  // the modal while the user is editing.
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;

    const bookmarks = getBookmarks();
    setIsBookmarked(bookmarks.some((b) => b.article.contId === Number(id)));

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getArticleDetail(id);
        let detailData = res?.data;
        if (detailData && detailData.data && detailData.contId === undefined) {
          detailData = detailData.data;
        }

        if (detailData) {
          setArticle(detailData);
          addHistory({
            contId: detailData.contId,
            nodeId: detailData.nodeId,
            name: detailData.name,
            summary: detailData.summary,
            pubTime: detailData.pubTime,
            pubTimeLong: new Date(detailData.pubTime).getTime(),
            pic: detailData.headPic,
            appHeadPic: detailData.headPic,
            link: "",
            userInfo: detailData.authorList?.[0]
              ? {
                  name: detailData.authorList[0].name,
                  pic: detailData.authorList[0].pic,
                }
              : undefined,
          });
        } else {
          throw new Error("Failed to load article details");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (article) {
      setHighlights(getHighlights(article.contId));
    }
  }, [article]);

  // Text selection detection — use adaptive debounce:
  // touch devices get 800ms to allow handle adjustment, mouse gets 150ms.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const DEBOUNCE = isTouch ? 800 : 150;

    const showPopupForSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelectionPopup(null);
        return;
      }
      if (!contentRef.current?.contains(sel.anchorNode)) return;
      const text = sel.toString().trim();
      if (text.length < 2) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopup({ x: rect.left + rect.width / 2, y: rect.top, text });
      setActiveHighlightId(null);
    };

    const onSelectionChange = () => {
      clearTimeout(timer);
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        timer = setTimeout(() => setSelectionPopup(null), 200);
        return;
      }
      if (!contentRef.current?.contains(sel.anchorNode)) return;
      timer = setTimeout(showPopupForSelection, DEBOUNCE);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      clearTimeout(timer);
    };
  }, []);

  // Dismiss selection popup on pointerdown outside content area and popup
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-popup]")) return;
      if (contentRef.current?.contains(target)) return;
      setSelectionPopup(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // Dismiss the selection popup on scroll (only; activeHighlight modal is intentionally
  // excluded so keyboard-induced scroll doesn't close it mid-edit).
  useEffect(() => {
    if (!selectionPopup) return;
    const handler = () => setSelectionPopup(null);
    window.addEventListener("scroll", handler, { once: true, passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [selectionPopup]);

  const [showHighlightModal, setShowHighlightModal] = useState(false);
  // Keep a stable copy of the selected text so the modal isn't destroyed when
  // selectionPopup is cleared (e.g. by the scroll handler when the mobile
  // keyboard appears and causes a layout/scroll shift).
  const [pendingHighlightText, setPendingHighlightText] = useState<string | null>(null);

  const handleOpenHighlightModal = useCallback(() => {
    if (!selectionPopup) return;
    setPendingHighlightText(selectionPopup.text);
    // Clear selectionPopup now so the scroll/pointerdown handlers won't
    // interfere with the modal that is about to open.
    setSelectionPopup(null);
    setShowHighlightModal(true);
  }, [selectionPopup]);

  const handleSaveHighlight = useCallback(
    (category: string, thought?: string) => {
      if (!pendingHighlightText || !article) return;
      addHighlight(article.contId, pendingHighlightText, article.name, undefined, undefined, category, thought);
      setHighlights(getHighlights(article.contId));
      window.getSelection()?.removeAllRanges();
      setPendingHighlightText(null);
      setShowHighlightModal(false);
    },
    [pendingHighlightText, article],
  );

  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      if (!article) return;
      removeHighlight(article.contId, highlightId);
      setHighlights(getHighlights(article.contId));
      setActiveHighlight(null);
    },
    [article],
  );

  const handleUpdateHighlight = useCallback(
    (highlightId: string, updates: { thought?: string; category?: string }) => {
      if (!article) return;
      updateHighlight(article.contId, highlightId, updates);
      setHighlights(getHighlights(article.contId));
      // Update the activeHighlight state to reflect the saved changes immediately
      setActiveHighlight((prev) =>
        prev && prev.id === highlightId
          ? { ...prev, ...updates, thought: updates.thought ?? undefined, category: updates.category ?? prev.category }
          : prev,
      );
    },
    [article],
  );

  const toggleBookmark = () => {
    if (isBookmarked && article) {
      removeBookmark(article.contId);
      setIsBookmarked(false);
    } else {
      setShowBookmarkModal(true);
    }
  };

  const handleSaveBookmark = (category: string) => {
    if (article) {
      addBookmark(
        {
          contId: article.contId,
          nodeId: article.nodeId,
          name: article.name,
          summary: article.summary,
          pubTime: article.pubTime,
          pubTimeLong: new Date(article.pubTime).getTime(),
          pic: article.headPic,
          appHeadPic: article.headPic,
          link: "",
          userInfo: article.authorList?.[0]
            ? {
                name: article.authorList[0].name,
                pic: article.authorList[0].pic,
              }
            : undefined,
        },
        category,
      );
      setIsBookmarked(true);
    }
    setShowBookmarkModal(false);
  };

  const sanitizedContent = useMemo(() => {
    if (!article) return "";
    return DOMPurify.sanitize(article.content, {
      ADD_ATTR: ["target"],
    });
  }, [article]);

  const highlightedContent = useMemo(() => {
    if (!sanitizedContent || !highlights.length) return sanitizedContent;
    const tmp = document.createElement("div");
    tmp.innerHTML = sanitizedContent;
    const instance = new Mark(tmp);
    for (const h of highlights) {
      let found = false;
      instance.mark(h.text, {
        separateWordSearch: false,
        acrossElements: true,
        className: "article-highlight",
        filter: () => {
          if (found) return false;
          found = true;
          return true;
        },
        each: (el) => {
          el.setAttribute("data-highlight-id", h.id);
        },
      });
    }
    return tmp.innerHTML;
  }, [sanitizedContent, highlights]);

  const handleMarkClick = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark[data-highlight-id]") as HTMLElement | null;
      if (!mark) return;
      e.stopPropagation();
      const hId = mark.getAttribute("data-highlight-id");
      if (hId) {
        // Resolve the highlight object immediately and store it directly.
        // We intentionally do NOT keep an activeHighlightId in state so that
        // the scroll-dismiss handler (which fires when the mobile keyboard
        // appears after the user taps the edit textarea) has nothing to clear.
        const found = highlights.find((h) => h.id === hId) ?? null;
        setActiveHighlight(found);
        setSelectionPopup(null);
        window.getSelection()?.removeAllRanges();
      }
    },
    [highlights],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <p className="text-red-600 font-medium mb-4">{error || "Article not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleBookmark}
              className={`p-2 transition-colors rounded-full ${
                isBookmarked ? "text-brand bg-brand/10 hover:bg-brand/20" : "text-gray-600 hover:text-brand hover:bg-brand/5"
              }`}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-6 md:py-10 select-text relative">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gray-900 leading-tight mb-6">{article.name}</h1>

          <p className="text-lg md:text-xl text-gray-600 font-serif italic mb-8 leading-relaxed">{article.summary}</p>

          <div className="flex items-center justify-between py-4 border-y border-gray-100">
            <div className="flex items-center space-x-3">
              {article.authorList?.[0]?.pic && (
                <img
                  src={article.authorList[0].pic}
                  alt={article.authorList[0].name}
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{article.authorList?.map((a) => a.name).join(", ") || "Seventh Tone"}</p>
                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                  <Clock size={12} className="mr-1" />
                  <time dateTime={article.pubTime}>{article.pubTime}</time>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        {article.headPic && (
          <figure className="mb-10 -mx-4 sm:mx-0">
            <img
              src={article.headPic}
              alt={article.name}
              className="w-full h-auto sm:rounded-xl object-cover bg-gray-100"
              referrerPolicy="no-referrer"
            />
          </figure>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="prose prose-lg md:prose-xl prose-emerald max-w-none prose-p:font-serif prose-p:leading-relaxed prose-p:text-gray-800 prose-a:text-emerald-600 prose-img:rounded-xl select-text"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
          onClick={handleMarkClick}
        />
      </article>

      {/* Selection Popup */}
      {selectionPopup && (
        <div
          data-popup
          className="fixed z-[100]"
          style={{
            left: Math.max(60, Math.min(selectionPopup.x, window.innerWidth - 60)),
            top: selectionPopup.y,
            transform: selectionPopup.y > 60 ? "translate(-50%, -100%) translateY(-10px)" : "translate(-50%, 0) translateY(10px)",
          }}
        >
          <button
            onClick={handleOpenHighlightModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-full shadow-xl hover:bg-gray-800 active:scale-95 transition-all"
          >
            <Highlighter size={14} />
            Highlight
          </button>
        </div>
      )}

      {/* Highlight Detail Modal */}
      {activeHighlight && (
        <HighlightDetailModal
          highlight={activeHighlight}
          onClose={() => setActiveHighlight(null)}
          onDelete={() => handleRemoveHighlight(activeHighlight.id)}
          onSave={(updates) => handleUpdateHighlight(activeHighlight.id, updates)}
        />
      )}

      {showBookmarkModal && <BookmarkModal onClose={() => setShowBookmarkModal(false)} onSave={handleSaveBookmark} />}
      {showHighlightModal && pendingHighlightText && (
        <HighlightSaveModal
          selectedText={pendingHighlightText}
          onClose={() => { setShowHighlightModal(false); setPendingHighlightText(null); window.getSelection()?.removeAllRanges(); }}
          onSave={handleSaveHighlight}
        />
      )}
    </div>
  );
}
