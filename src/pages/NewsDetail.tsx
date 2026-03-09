import { useEffect, useState, useMemo, useRef, useCallback, type MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getNewsDetail,
  addHistory,
  addBookmark,
  getBookmarks,
  removeBookmark,
  getHighlights,
  addHighlight,
  removeHighlight,
  updateHighlight,
  addVocab,
  isInVocab,
} from "../api/api";
import { NewsDetail, Highlight } from "../types";
import DOMPurify from "dompurify";
import Mark from "mark.js";
import { ChevronLeft, ChevronRight, Loader2, Clock, Bookmark, BookmarkCheck, BookmarkPlus, X, Share2, Volume2, Brain } from "lucide-react";
import BookmarkModal from "../components/BookmarkModal";
import HighlightSaveModal from "../components/HighlightSaveModal";
import HighlightDetailModal from "../components/HighlightDetailModal";
import { request } from "../utils/request";
import { addReadingSession } from "../api/localData";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Share } from "@capacitor/share";
import TextSelectionHighlight from "../plugins/textSelectionHighlight";
import { useTheme } from "../contexts/ThemeContext";

const SIXTH_TONE_WEB = "https://www.sixthtone.com";

// 鑻辫鍗曡瘝璇﹁В API (v2.xxapi.cn) 鍝嶅簲绫诲瀷
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
    const pos = (
      doc as Document & { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null }
    ).caretPositionFromPoint(clientX, clientY);
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
  const word = text
    .slice(start, end)
    .replace(/^[-']+|[-']+$/g, "")
    .trim();
  if (!word || word.length < 2) return null;
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, rect: range.getBoundingClientRect() };
}

export default function NewsDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fontScale } = useTheme();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  // activeHighlight is set directly in handleMarkClick (not via an intermediate
  // activeHighlightId) so that the scroll-dismiss handler never holds a reference
  // to it 鈥?keyboard appearance causes a scroll event that would otherwise clear
  // the modal while the user is editing.
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [pendingHighlightText, setPendingHighlightText] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dictAudioRef = useRef<HTMLAudioElement>(null);

  // Dictionary lookup popup (click word to show definition) 鈥?declared early so useEffects below can reference it
  const [dictPopup, setDictPopup] = useState<{ x: number; y: number; word: string } | null>(null);
  const [dictData, setDictData] = useState<DictData | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const newscaleClasses = {
    small: {
      title: "text-[1.85rem] md:text-[2.35rem] lg:text-[2.95rem]",
      summary: "text-[1rem] md:text-[1.1rem]",
      prose: "prose-base md:prose-lg",
    },
    medium: {
      title: "text-3xl md:text-4xl lg:text-5xl",
      summary: "text-lg md:text-xl",
      prose: "prose-lg md:prose-xl",
    },
    large: {
      title: "text-[2.15rem] md:text-[2.7rem] lg:text-[3.35rem]",
      summary: "text-[1.15rem] md:text-[1.3rem]",
      prose: "prose-xl md:prose-2xl",
    },
  } as const;

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
    setIsBookmarked(bookmarks.some((b) => b.news.contId === Number(id)));

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getNewsDetail(id);
        let detailData = res?.data;
        if (detailData && detailData.data && detailData.contId === undefined) {
          detailData = detailData.data;
        }

        if (detailData) {
          setNews(detailData);
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
          throw new Error("Failed to load news details");
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
    if (news) {
      setHighlights(getHighlights(news.contId));
    }
  }, [news]);

  useEffect(() => {
    if (!news) return;

    let sessionStart = Date.now();

    const pauseSession = () => {
      if (sessionStart === 0) return;
      addReadingSession(news.contId, Date.now() - sessionStart);
      sessionStart = 0;
    };

    const resumeSession = () => {
      if (document.visibilityState === "visible" && sessionStart === 0) {
        sessionStart = Date.now();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseSession();
      } else {
        resumeSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", pauseSession);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", pauseSession);
      pauseSession();
    };
  }, [news]);

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

  // Android textselect
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

  // Keep the latest popup state in a ref so the Android back handler
  // can read current values without re-registering listeners.
  const backStateRef = useRef({
    dictPopup: null as typeof dictPopup,
    activeHighlight: null as typeof activeHighlight,
    showHighlightModal: false,
    showBookmarkModal: false,
  });
  backStateRef.current = { dictPopup, activeHighlight, showHighlightModal, showBookmarkModal };

  // Handle the native Android back button via Capacitor.
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", (e: { canGoBack: boolean }) => {
      const s = backStateRef.current;
      if (s.dictPopup) {
        setDictPopup(null);
        return;
      }
      if (s.activeHighlight) {
        setActiveHighlight(null);
        return;
      }
      if (s.showHighlightModal) {
        setShowHighlightModal(false);
        setPendingHighlightText(null);
        window.getSelection()?.removeAllRanges();
        return;
      }
      if (s.showBookmarkModal) {
        setShowBookmarkModal(false);
        return;
      }
      if (e.canGoBack) {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    }).then((h) => {
      listenerHandle = h;
    });
    return () => {
      listenerHandle?.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // 浠?navigate 绋冲畾鍚庨噸缁戝畾锛宯avigate 鏈韩鏄ǔ瀹氬紩鐢?
  // pendingHighlightText: stable copy of selected text so the modal isn't destroyed when
  // selectionPopup is cleared (e.g. by the scroll handler when the mobile keyboard appears).

  const handleSaveHighlight = useCallback(
    (category: string, thought?: string) => {
      if (!pendingHighlightText || !news) return;
      addHighlight(news.contId, pendingHighlightText, news.name, undefined, undefined, category, thought);
      setHighlights(getHighlights(news.contId));
      window.getSelection()?.removeAllRanges();
      setPendingHighlightText(null);
      setShowHighlightModal(false);
    },
    [pendingHighlightText, news],
  );

  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      if (!news) return;
      removeHighlight(news.contId, highlightId);
      setHighlights(getHighlights(news.contId));
      setActiveHighlight(null);
    },
    [news],
  );

  const handleUpdateHighlight = useCallback(
    (highlightId: string, updates: { thought?: string; category?: string }) => {
      if (!news) return;
      updateHighlight(news.contId, highlightId, updates);
      setHighlights(getHighlights(news.contId));
      // Update the activeHighlight state to reflect the saved changes immediately
      setActiveHighlight((prev) =>
        prev && prev.id === highlightId
          ? { ...prev, ...updates, thought: updates.thought ?? undefined, category: updates.category ?? prev.category }
          : prev,
      );
    },
    [news],
  );

  const handleShare = useCallback(async () => {
    if (!news) return;
    const url = `${SIXTH_TONE_WEB}/news/${news.contId}`;
    try {
      const { value: canShareValue } = await Share.canShare();
      if (canShareValue) {
        await Share.share({
          title: news.name,
          text: news.name,
          url,
          dialogTitle: "鍒嗕韩鏂伴椈",
        });
      } else {
        // 闄嶇骇锛氬鍒堕摼鎺ュ埌鍓创鏉?        await navigator.clipboard.writeText(url);
      }
    } catch {
      // 鐢ㄦ埛鍙栨秷鎴栧嚭閿欙紝闈欓粯蹇界暐
    }
  }, [news]);

  const toggleBookmark = () => {
    if (isBookmarked && news) {
      removeBookmark(news.contId);
      setIsBookmarked(false);
    } else {
      setShowBookmarkModal(true);
    }
  };

  const handleSaveBookmark = (category: string) => {
    if (news) {
      addBookmark(
        {
          contId: news.contId,
          nodeId: news.nodeId,
          name: news.name,
          summary: news.summary,
          pubTime: news.pubTime,
          pubTimeLong: new Date(news.pubTime).getTime(),
          pic: news.headPic,
          appHeadPic: news.headPic,
          link: "",
          userInfo: news.authorList?.[0]
            ? {
                name: news.authorList[0].name,
                pic: news.authorList[0].pic,
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
    if (!news) return "";
    return DOMPurify.sanitize(news.content, {
      ADD_ATTR: ["target"],
    });
  }, [news]);

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
        className: "news-highlight",
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
          setDictError(res?.msg || "No definition found.");
        }
      })
      .catch(() => {
        setDictData(null);
        setDictError("No definition found.");
      })
      .finally(() => setDictLoading(false));
  }, [dictPopup?.word]);

  // Double-click a word to open the dictionary popup.
  const handleContentDblClick = useCallback((e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("mark[data-highlight-id]")) return;
    const hit = getWordAtPoint(e.clientX, e.clientY);
    if (!hit) return;
    // Clear the browser selection before opening the popup.
    window.getSelection()?.removeAllRanges();
    setDictPopup({ x: hit.rect.left + hit.rect.width / 2, y: hit.rect.bottom, word: hit.word });
  }, []);

  // Whether the current popup word is already saved in vocabulary.
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

  if (error || !news) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center max-w-md w-full">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error || "News not found"}</p>
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
    <div className="bg-white dark:bg-slate-900 min-h-screen pb-32 overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              className="p-2 transition-colors rounded-full text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
              aria-label="Share news"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={toggleBookmark}
              className={`p-2 transition-colors rounded-full ${
                isBookmarked
                  ? "text-brand dark:text-emerald-400 bg-brand/10 dark:bg-emerald-500/20 hover:bg-brand/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
              }`}
              aria-label={isBookmarked ? "Unbookmark news" : "Bookmark news"}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>
        </div>
      </div>

      <News className="max-w-3xl mx-auto px-4 py-6 md:py-10 select-text relative overflow-x-hidden">
        {/* Header锛氭爣棰樺拰 summary 鏀寔鐐瑰嚮鏌ヨ瘝 */}
        <header className="mb-8">
          <h1
            className={`${newscaleClasses[fontScale].title} font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight mb-6 cursor-text`}
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) handleContentDblClick(e);
            }}
          >
            {news.name}
          </h1>

          <p
            className={`${newscaleClasses[fontScale].summary} text-gray-600 dark:text-gray-500 font-serif italic mb-8 leading-relaxed cursor-text`}
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest("a")) handleContentDblClick(e);
            }}
          >
            {news.summary}
          </p>

          <div className="flex items-center justify-between py-4 border-y border-gray-100 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              {news.authorList?.[0]?.pic && (
                <img
                  src={news.authorList[0].pic}
                  alt={news.authorList[0].name}
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {news.authorList?.map((a) => a.name).join(", ") || "Seventh Tone"}
                </p>
                <div className="flex items-center text-s text-gray-500 dark:text-gray-400 mt-0.5">
                  <Clock size={12} className="mr-1" />
                  <time dateTime={news.pubTime}>{news.pubTime}</time>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        {news.headPic && (
          <figure className="mb-10 -mx-4 sm:mx-0">
            <img
              src={news.headPic}
              alt={news.name}
              className="w-full h-auto sm:rounded-xl object-cover bg-gray-100 dark:bg-slate-800"
              referrerPolicy="no-referrer"
            />
          </figure>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className={`prose ${newscaleClasses[fontScale].prose} prose-emerald max-w-none overflow-x-hidden break-words prose-p:font-serif prose-p:leading-relaxed prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto [&_iframe]:max-w-full [&_video]:max-w-full [&_svg]:max-w-full [&_*]:break-words select-text`}
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
          onClick={handleMarkClick}
          onDoubleClick={handleContentDblClick}
        />

        {/* AI Practice CTA*/}
        <div className="mt-14 pt-8 border-t border-gray-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() =>
              navigate(`/practice/${news.contId}`, {
                state: {
                  title: news.name,
                  contentHtml: news.content,
                },
              })
            }
            className="group relative w-full flex items-center gap-4 p-4 rounded-xl 
                      bg-transparent hover:bg-gray-50/80 dark:hover:bg-slate-800/40 
                      border border-gray-100 dark:border-slate-800 
                      hover:border-emerald-200 dark:hover:border-emerald-500/30
                      transition-all duration-200 ease-in-out"
          >
            {/* 1. Icon: No background, purely icon-focused */}
            <div className="flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
            </div>

            {/* 2. Text Content: Balanced spacing and hierarchy */}
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 leading-none">Test Your Understanding</h4>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[13px] text-gray-500 dark:text-gray-400">AI exercises</span>
              </div>
            </div>

            {/* 3. Action: Clean button pill */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-600 transition-colors duration-200">
              <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-white tracking-wide">START</span>
              <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        </div>
      </News>
      
      {dictPopup && (
        <button
          type="button"
          data-popup
          aria-label="Close dictionary"
          className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm cursor-default"
          onClick={() => setDictPopup(null)}
        />
      )}
      {/* Dictionary popup */}
      {dictPopup && (
        <div
          data-popup
          className="fixed inset-x-0 bottom-0 z-[100] h-[55vh] min-h-[280px] max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 border-b-0 md:left-1/2 md:right-auto md:top-auto md:w-[min(96vw,420px)] md:max-h-[70vh] md:min-h-0 md:rounded-b-2xl md:border-b md:-translate-x-1/2 md:bottom-6"
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
                aria-label={wordInVocab ? "Already in vocabulary" : "Add to vocabulary"}
                title={wordInVocab ? "Already in vocabulary" : "Add to vocabulary"}
              >
                {wordInVocab ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setDictPopup(null)}
                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                aria-label="Close"
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
            {dictError && !dictLoading && <p className="text-gray-500 dark:text-gray-400 text-sm py-6">{dictError}</p>}
            {dictData && !dictLoading && (
              <div className="space-y-5 text-sm dark:text-gray-200">
                {/* Pronunciation */}
                {(dictData.ukphone || dictData.usphone) && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {dictData.ukphone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">UK</span>
                        <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{dictData.ukphone}/</span>
                        {dictData.ukspeech && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = dictAudioRef.current;
                              if (el) {
                                el.src = dictData.ukspeech!;
                                el.play().catch(() => {});
                              }
                            }}
                            className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            aria-label="Play UK pronunciation"
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    {dictData.usphone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">US</span>
                        <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{dictData.usphone}/</span>
                        {dictData.usspeech && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = dictAudioRef.current;
                              if (el) {
                                el.src = dictData.usspeech!;
                                el.play().catch(() => {});
                              }
                            }}
                            className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                            aria-label="Play US pronunciation"
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Definitions */}
                {dictData.translations && dictData.translations.length > 0 && (
                  <section>
                    <h4 className="text-s font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Definitions</h4>
                    <ul className="space-y-1 list-none pl-0">
                      {dictData.translations.map((t, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="text-gray-500 dark:text-gray-400">{t.pos}.</span> {t.tran_cn}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {/* Phrases */}
                {dictData.phrases && dictData.phrases.length > 0 && (
                  <section>
                    <h4 className="text-s font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Phrases</h4>
                    <ul className="space-y-1.5 list-none pl-0">
                      {dictData.phrases.slice(0, 12).map((p, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{p.p_content}</span>
                          <span className="text-gray-500 dark:text-gray-400"> - {p.p_cn}</span>
                        </li>
                      ))}
                      {dictData.phrases.length > 12 && (
                        <li className="text-gray-400 dark:text-gray-500 text-s">Total {dictData.phrases.length} phrases</li>
                      )}
                    </ul>
                  </section>
                )}
                {/* Related words */}
                {dictData.relWords && dictData.relWords.length > 0 && (
                  <section>
                    <h4 className="text-s font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Related words</h4>
                    <div className="space-y-2">
                      {dictData.relWords.map((g, i) => (
                        <div key={i}>
                          <span className="text-gray-500 dark:text-gray-400">{g.Pos}</span>{" "}
                          {g.Hwds.map((h, j) => (
                            <span key={j} className="text-gray-800 dark:text-gray-200">
                              {h.hwd}
                              <span className="text-gray-500 dark:text-gray-400"> {h.tran}</span>
                              {j < g.Hwds.length - 1 ? "; " : ""}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {/* Synonyms */}
                {dictData.synonyms && dictData.synonyms.length > 0 && (
                  <section>
                    <h4 className="text-s font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Synonyms</h4>
                    <ul className="space-y-1 list-none pl-0">
                      {dictData.synonyms.map((s, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="text-gray-500 dark:text-gray-400">{s.pos}</span> {s.tran}
                          {" - "}
                          {s.Hwds.map((h) => h.word).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {/* Example sentences */}
                {dictData.sentences && dictData.sentences.length > 0 && (
                  <section>
                    <h4 className="text-s font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Example sentences</h4>
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
          onClose={() => {
            setShowHighlightModal(false);
            setPendingHighlightText(null);
            window.getSelection()?.removeAllRanges();
          }}
          onSave={handleSaveHighlight}
        />
      )}
    </div>
  );
}
