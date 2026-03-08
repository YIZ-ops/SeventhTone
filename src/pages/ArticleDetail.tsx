import { useEffect, useState, useMemo, useRef, useCallback, type MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArticleDetail, addHistory, addBookmark, getBookmarks, removeBookmark, getHighlights, addHighlight, removeHighlight, updateHighlight, addVocab, isInVocab } from "../api/api";
import { ArticleDetail, Highlight } from "../types";
import DOMPurify from "dompurify";
import Mark from "mark.js";
import { ChevronLeft, Loader2, Clock, Bookmark, BookmarkCheck, BookmarkPlus, X, Share2, Volume2 } from "lucide-react";
import BookmarkModal from "../components/BookmarkModal";
import HighlightSaveModal from "../components/HighlightSaveModal";
import HighlightDetailModal from "../components/HighlightDetailModal";
import { request } from "../utils/request";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Share } from "@capacitor/share";
import TextSelectionHighlight from "../plugins/textSelectionHighlight";

const SIXTH_TONE_WEB = "https://www.sixthtone.com";

// 英语单词详解 API (v2.xxapi.cn) 响应类型
interface DictPhrase {
  p_cn: string;
  p_content: string;
}
interface DictRelWordHwd {
  hwd: string;
  tran: string;
}
interface DictRelWord {
  Hwds: DictRelWordHwd[];
  Pos: string;
}
interface DictSentence {
  s_cn: string;
  s_content: string;
}
interface DictSynonymHwd {
  word: string;
}
interface DictSynonym {
  Hwds: DictSynonymHwd[];
  pos: string;
  tran: string;
}
interface DictTranslation {
  pos: string;
  tran_cn: string;
}
interface DictData {
  word: string;
  bookId?: string;
  ukphone?: string;
  ukspeech?: string;
  usphone?: string;
  usspeech?: string;
  phrases?: DictPhrase[];
  relWords?: DictRelWord[];
  sentences?: DictSentence[];
  synonyms?: DictSynonym[];
  translations?: DictTranslation[];
}
interface DictApiResponse {
  code: number;
  msg: string;
  data?: DictData;
}

const DICT_API_BASE = "https://v2.xxapi.cn/api/englishwords";

function getWordAtPoint(clientX: number, clientY: number): { word: string; rect: DOMRect } | null {
  const doc = document;
  let range: Range | null = null;
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (doc.caretPositionFromPoint) {
    const pos = (doc as Document & { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(clientX, clientY);
    if (!pos) return null;
    range = doc.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
  }
  if (!range) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || "";
  const offset = range.startOffset;
  const before = text.slice(0, offset).match(/([a-zA-Z'-]*)$/);
  const after = text.slice(offset).match(/^([a-zA-Z'-]*)/);
  const start = offset - (before ? before[1].length : 0);
  const end = offset + (after ? after[1].length : 0);
  const word = text.slice(start, end).replace(/^[-']+|[-']+$/g, "").trim();
  if (!word || word.length < 2) return null;
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, rect: range.getBoundingClientRect() };
}

export default function ArticleDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  // activeHighlight is set directly in handleMarkClick (not via an intermediate
  // activeHighlightId) so that the scroll-dismiss handler never holds a reference
  // to it — keyboard appearance causes a scroll event that would otherwise clear
  // the modal while the user is editing.
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [pendingHighlightText, setPendingHighlightText] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dictAudioRef = useRef<HTMLAudioElement>(null);

  // Dictionary lookup popup (click word to show definition) — declared early so useEffects below can reference it
  const [dictPopup, setDictPopup] = useState<{ x: number; y: number; word: string } | null>(null);
  const [dictData, setDictData] = useState<DictData | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

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

  // Dismiss dictionary popup on pointerdown outside content area and popups
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-popup]")) return;
      if (contentRef.current?.contains(target)) return;
      setDictPopup(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // Dismiss dictionary popup on scroll
  useEffect(() => {
    if (!dictPopup) return;
    const handler = () => setDictPopup(null);
    window.addEventListener("scroll", handler, { once: true, passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [dictPopup]);

  // Android 原生文本选择菜单中的「高亮」：监听插件事件，用选中文本打开高亮弹窗
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let removeListener: (() => Promise<void>) | null = null;
    TextSelectionHighlight.addListener("highlightSelection", (e) => {
      const text = (e?.selectedText ?? "").trim();
      if (text.length < 2) return;
      setPendingHighlightText(text);
      setShowHighlightModal(true);
    }).then((h) => {
      removeListener = h.remove;
    });
    TextSelectionHighlight.enable().catch(() => {});
    return () => {
      removeListener?.();
    };
  }, []);

  // 用 ref 持有最新的弹窗状态，供 backButton handler 读取
  // 这样 listener 只注册一次，不会因状态变化反复重新注册
  const backStateRef = useRef({
    dictPopup: null as typeof dictPopup,
    activeHighlight: null as typeof activeHighlight,
    showHighlightModal: false,
    showBookmarkModal: false,
  });
  backStateRef.current = { dictPopup, activeHighlight, showHighlightModal, showBookmarkModal };

  // Android 物理/系统返回键：由 Capacitor 原生层触发，不监听任何手势
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", (e: { canGoBack: boolean }) => {
      const s = backStateRef.current;
      if (s.dictPopup) { setDictPopup(null); return; }
      if (s.activeHighlight) { setActiveHighlight(null); return; }
      if (s.showHighlightModal) {
        setShowHighlightModal(false);
        setPendingHighlightText(null);
        window.getSelection()?.removeAllRanges();
        return;
      }
      if (s.showBookmarkModal) { setShowBookmarkModal(false); return; }
      if (e.canGoBack) { navigate(-1); } else { CapacitorApp.exitApp(); }
    }).then((h) => { listenerHandle = h; });
    return () => { listenerHandle?.remove?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // 仅 navigate 稳定后重绑定，navigate 本身是稳定引用

  // pendingHighlightText: stable copy of selected text so the modal isn't destroyed when
  // selectionPopup is cleared (e.g. by the scroll handler when the mobile keyboard appears).

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

  const handleShare = useCallback(async () => {
    if (!article) return;
    const url = `${SIXTH_TONE_WEB}/news/${article.contId}`;
    try {
      const { value: canShareValue } = await Share.canShare();
      if (canShareValue) {
        await Share.share({
          title: article.name,
          text: article.name,
          url,
          dialogTitle: "分享文章",
        });
      } else {
        // 降级：复制链接到剪贴板
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // 用户取消或出错，静默忽略
    }
  }, [article]);

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
    (e: MouseEvent<HTMLElement>) => {
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
        window.getSelection()?.removeAllRanges();
      }
    },
    [highlights],
  );

  // Fetch dictionary when user clicks a word (GET ?word=xxx)
  useEffect(() => {
    if (!dictPopup?.word) return;
    const word = dictPopup.word;
    setDictData(null);
    setDictError(null);
    setDictLoading(true);
    const url = `${DICT_API_BASE}?word=${encodeURIComponent(word)}`;
    request<DictApiResponse>(url)
      .then((res) => {
        if (res?.code === 200 && res?.data) {
          setDictData(res.data);
          setDictError(null);
        } else {
          setDictData(null);
          setDictError(res?.msg || "未找到释义");
        }
      })
      .catch(() => {
        setDictData(null);
        setDictError("未找到释义");
      })
      .finally(() => setDictLoading(false));
  }, [dictPopup?.word]);

  // 双击触发查词（移动端双击会先选词，不能用 selection 判断，直接查词）
  const handleContentDblClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a") || target.closest("mark[data-highlight-id]")) return;
      const hit = getWordAtPoint(e.clientX, e.clientY);
      if (!hit) return;
      // 清除双击产生的文本选中，再显示弹窗
      window.getSelection()?.removeAllRanges();
      setDictPopup({ x: hit.rect.left + hit.rect.width / 2, y: hit.rect.bottom, word: hit.word });
    },
    [],
  );

  // 生词本：当前弹窗单词是否已收录
  const [wordInVocab, setWordInVocab] = useState(false);
  useEffect(() => {
    setWordInVocab(dictPopup?.word ? isInVocab(dictPopup.word) : false);
  }, [dictPopup?.word]);

  const handleAddToVocab = useCallback(() => {
    if (!dictPopup || wordInVocab) return;
    const translations = dictData?.translations?.map((t) => `${t.pos}. ${t.tran_cn}`) ?? [];
    addVocab(dictPopup.word, dictData?.ukphone, translations);
    setWordInVocab(true);
  }, [dictPopup, wordInVocab, dictData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error || "Article not found"}</p>
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
    <div className="bg-white dark:bg-slate-900 min-h-screen pb-32">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              className="p-2 transition-colors rounded-full text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
              aria-label="分享文章"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={toggleBookmark}
              className={`p-2 transition-colors rounded-full ${
                isBookmarked ? "text-brand dark:text-emerald-400 bg-brand/10 dark:bg-emerald-500/20 hover:bg-brand/20" : "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
              }`}
              aria-label={isBookmarked ? "取消收藏" : "收藏文章"}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-6 md:py-10 select-text relative">
        {/* Header：标题和 summary 支持点击查词 */}
        <header className="mb-8">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight mb-6 cursor-text"
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) handleContentDblClick(e);
            }}
          >
            {article.name}
          </h1>

          <p
            className="text-lg md:text-xl text-gray-600 dark:text-gray-500 font-serif italic mb-8 leading-relaxed cursor-text"
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) handleContentDblClick(e);
            }}
          >
            {article.summary}
          </p>

          <div className="flex items-center justify-between py-4 border-y border-gray-100 dark:border-slate-700">
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
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{article.authorList?.map((a) => a.name).join(", ") || "Seventh Tone"}</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
              className="w-full h-auto sm:rounded-xl object-cover bg-gray-100 dark:bg-slate-800"
              referrerPolicy="no-referrer"
            />
          </figure>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="prose prose-lg md:prose-xl prose-emerald max-w-none prose-p:font-serif prose-p:leading-relaxed prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-xl select-text"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
          onClick={handleMarkClick}
          onDoubleClick={handleContentDblClick}
        />
      </article>

      {/* 单词弹窗遮罩：背景模糊、不可操作，点击关闭。
          必须加 data-popup 让 pointerdown-dismiss handler 忽略此元素，
          否则 pointerdown 会先于 onClick 把 popup 关掉，导致点击穿透。 */}
      {dictPopup && (
        <button
          type="button"
          data-popup
          aria-label="关闭单词释义"
          className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm cursor-default"
          onClick={() => setDictPopup(null)}
        />
      )}
      {/* Dictionary popup: 移动端占满下半屏 */}
      {dictPopup && (
        <div
          data-popup
          className="fixed inset-x-0 bottom-0 z-[100] h-[55vh] min-h-[280px] max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-600 border-b-0 md:left-1/2 md:right-auto md:top-auto md:w-[min(96vw,420px)] md:max-h-[70vh] md:min-h-0 md:rounded-b-2xl md:border-b md:-translate-x-1/2 md:bottom-6"
        >
          <audio ref={dictAudioRef} className="hidden" />
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-700/50">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{dictPopup.word}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleAddToVocab}
                disabled={wordInVocab}
                className={`p-1.5 rounded-full transition-colors ${
                  wordInVocab
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-600"
                }`}
                aria-label={wordInVocab ? "已加入生词本" : "加入生词本"}
                title={wordInVocab ? "已加入生词本" : "加入生词本"}
              >
                {wordInVocab ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setDictPopup(null)}
                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {dictLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            )}
            {dictError && !dictLoading && (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-6">{dictError}</p>
            )}
            {dictData && !dictLoading && (
              <div className="space-y-5 text-sm dark:text-gray-200">
                {/* 音标 + 发音图标 */}
                {(dictData.ukphone || dictData.usphone) && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {dictData.ukphone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">英</span>
                        <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{dictData.ukphone}/</span>
                        {dictData.ukspeech && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = dictAudioRef.current;
                              if (el) { el.src = dictData.ukspeech!; el.play().catch(() => {}); }
                            }}
                            className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            aria-label="播放英音"
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    {dictData.usphone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">美</span>
                        <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{dictData.usphone}/</span>
                        {dictData.usspeech && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = dictAudioRef.current;
                              if (el) { el.src = dictData.usspeech!; el.play().catch(() => {}); }
                            }}
                            className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            aria-label="播放美音"
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* 翻译 */}
                {dictData.translations && dictData.translations.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">释义</h4>
                    <ul className="space-y-1 list-none pl-0">
                      {dictData.translations.map((t, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="text-gray-500 dark:text-gray-400">{t.pos}.</span> {t.tran_cn}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {/* 短语 */}
                {dictData.phrases && dictData.phrases.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">短语</h4>
                    <ul className="space-y-1.5 list-none pl-0">
                      {dictData.phrases.slice(0, 12).map((p, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{p.p_content}</span>
                          <span className="text-gray-500 dark:text-gray-400"> — {p.p_cn}</span>
                        </li>
                      ))}
                      {dictData.phrases.length > 12 && (
                        <li className="text-gray-400 dark:text-gray-500 text-xs">共 {dictData.phrases.length} 条</li>
                      )}
                    </ul>
                  </section>
                )}
                {/* 同根词 */}
                {dictData.relWords && dictData.relWords.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">同根词</h4>
                    <div className="space-y-2">
                      {dictData.relWords.map((g, i) => (
                        <div key={i}>
                          <span className="text-gray-500 dark:text-gray-400">{g.Pos}</span>
                          {" "}
                          {g.Hwds.map((h, j) => (
                            <span key={j} className="text-gray-800 dark:text-gray-200">
                              {h.hwd}
                              <span className="text-gray-500 dark:text-gray-400"> {h.tran}</span>
                              {j < g.Hwds.length - 1 ? "；" : ""}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {/* 近义词 */}
                {dictData.synonyms && dictData.synonyms.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">近义词</h4>
                    <ul className="space-y-1 list-none pl-0">
                      {dictData.synonyms.map((s, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="text-gray-500 dark:text-gray-400">{s.pos}</span> {s.tran}
                          {" — "}
                          {s.Hwds.map((h) => h.word).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {/* 例句 */}
                {dictData.sentences && dictData.sentences.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">例句</h4>
                    <ul className="space-y-2 list-none pl-0">
                      {dictData.sentences.slice(0, 5).map((s, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <p className="text-gray-900 dark:text-gray-100">{s.s_content}</p>
                          <p className="text-gray-500 dark:text-gray-400 italic mt-0.5">{s.s_cn}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
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
