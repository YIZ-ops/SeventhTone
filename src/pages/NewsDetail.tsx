import { useEffect, useState, useMemo, useRef, useCallback, type MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getNewsDetail,
  addHistory,
  addBookmark,
  getBookmarks,
  removeBookmark,
  getSentences,
  addSentence,
  removeSentence,
  updateSentence,
  addVocab,
  isInVocab,
  getVocab,
  removeVocab,
} from "../api/api";
import { NewsDetail, Sentence } from "../types";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas-pro";
import Mark from "mark.js";
import { ChevronLeft, ChevronRight, Loader2, Clock, Bookmark, BookmarkCheck, BookmarkPlus, X, Share2, Volume2, Brain } from "lucide-react";
import BookmarkModal from "../components/BookmarkModal";
import SentenceSaveModal from "../components/SentenceSaveModal";
import SentenceDetailModal from "../components/SentenceDetailModal";
import { request } from "../utils/request";
import { addReadingSession } from "../api/localData";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import TextSelectionHighlight from "../plugins/textSelectionHighlight";
import { useTheme } from "../contexts/ThemeContext";
import { awardNewsReadingPoints } from "../api/points";
import { useBottomToast } from "../utils/toast";

const SIXTH_TONE_WEB = "https://www.sixthtone.com";

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

/**
 * Explicit font stack for the share card.
 * html2canvas resolves fonts at render-time; without a declared family it falls
 * back to its own default which differs across platforms and causes glyph-width
 * mismatches ("@" gets extra gaps, "." gets swallowed, etc.).
 */
const SHARE_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Minimal HTML cleaning for the share card.
 *
 * Key principles:
 *  1. Keep the original HTML structure – the browser handles word spacing.
 *  2. Use **px** for font-size AND line-height (never rem / unitless multiplier)
 *     so html2canvas calculates identical metrics regardless of root font-size.
 *  3. Declare font-family on every element so html2canvas doesn't fall back to
 *     a mismatched default font stack.
 */
function buildShareContentHtml(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove non-text elements
  temp
    .querySelectorAll("img, figure, figcaption, video, audio, iframe, table, script, style, noscript, svg, picture, source")
    .forEach((n) => n.remove());

  // Strip class/style so Tailwind / dark-mode classes don't leak in
  temp.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("class");
    el.removeAttribute("style");
  });

  // Block-level styles (font-size + line-height in px, explicit font-family)
  const font = `font-family:${SHARE_FONT};`;
  const pStyle = `${font}font-size:22px;line-height:39px;color:#1e293b;margin:18px 0 0;letter-spacing:0px;`;
  temp.querySelectorAll("p").forEach((el) => el.setAttribute("style", pStyle));
  temp
    .querySelectorAll("h2")
    .forEach((el) => el.setAttribute("style", `${font}font-size:28px;line-height:40px;font-weight:700;color:#1e293b;margin:18px 0 0;`));
  temp
    .querySelectorAll("h3, h4")
    .forEach((el) => el.setAttribute("style", `${font}font-size:24px;line-height:35px;font-weight:700;color:#1e293b;margin:18px 0 0;`));
  temp
    .querySelectorAll("blockquote")
    .forEach((el) =>
      el.setAttribute(
        "style",
        `${font}font-size:22px;line-height:39px;color:#334155;margin:18px 0 0;padding-left:18px;border-left:4px solid rgba(16,185,129,0.28);`,
      ),
    );
  temp.querySelectorAll("ul, ol").forEach((el) => el.setAttribute("style", `${font}margin:18px 0 0;padding-left:24px;`));
  temp.querySelectorAll("li").forEach((el) => el.setAttribute("style", `${font}font-size:22px;line-height:39px;color:#1e293b;`));

  // Inline elements – inherit size/height, but set font-family explicitly
  temp.querySelectorAll("a").forEach((el) => el.setAttribute("style", `${font}color:#059669;text-decoration:none;`));
  temp.querySelectorAll("strong, b").forEach((el) => el.setAttribute("style", `${font}font-weight:700;`));
  temp.querySelectorAll("em, i").forEach((el) => el.setAttribute("style", `${font}font-style:italic;`));
  temp.querySelectorAll("span").forEach((el) => el.setAttribute("style", `${font}`));

  // Zero-out margin on the very first visible block
  const first = temp.querySelector("p, h2, h3, h4, blockquote, ul, ol");
  if (first) {
    const s = first.getAttribute("style") || "";
    first.setAttribute("style", s.replace(/margin:\s*18px 0 0/, "margin:0"));
  }

  return temp.innerHTML;
}

function normalizeTextWithMap(text: string) {
  let normalized = "";
  const normalizedToRaw: number[] = [];
  let pendingSpace = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (/\s/.test(char)) {
      if (normalized.length > 0) {
        pendingSpace = true;
      }
      continue;
    }

    if (pendingSpace) {
      normalized += " ";
      normalizedToRaw.push(index);
      pendingSpace = false;
    }

    normalized += char;
    normalizedToRaw.push(index);
  }

  return { normalized, normalizedToRaw };
}

function findTextRange(rawText: string, needle: string, occupiedRanges: Array<{ start: number; end: number }>) {
  const haystack = normalizeTextWithMap(rawText);
  const target = normalizeTextWithMap(needle).normalized;
  if (!target) return null;

  let fromIndex = 0;
  while (fromIndex <= haystack.normalized.length - target.length) {
    const normalizedIndex = haystack.normalized.indexOf(target, fromIndex);
    if (normalizedIndex === -1) return null;

    const rawStart = haystack.normalizedToRaw[normalizedIndex];
    const rawEnd = haystack.normalizedToRaw[normalizedIndex + target.length - 1] + 1;
    const overlaps = occupiedRanges.some((range) => rawStart < range.end && rawEnd > range.start);

    if (!overlaps) {
      return { start: rawStart, length: rawEnd - rawStart, end: rawEnd };
    }

    fromIndex = normalizedIndex + target.length;
  }

  return null;
}

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
  const { showToast } = useBottomToast();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [sentences, setSentences] = useState<Sentence[]>([]);
  // activeSentence is set directly in handleMarkClick (not via an intermediate
  // activeSentenceId) so that the scroll-dismiss handler never holds a reference
  // to it keyboard appearance causes a scroll event that would otherwise clear
  // the modal while the user is editing.
  const [activeSentence, setActiveSentence] = useState<Sentence | null>(null);
  const [showSentenceModal, setShowSentenceModal] = useState(false);
  const [pendingSentenceText, setPendingSentenceText] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dictAudioRef = useRef<HTMLAudioElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Dictionary lookup popup (click word to show definition) declared early so useEffects below can reference it
  const [dictPopup, setDictPopup] = useState<{ x: number; y: number; word: string } | null>(null);
  const [dictData, setDictData] = useState<DictData | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const newsScaleClasses = {
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
    if (!news) return;
    if (!news.headPic) {
      setShowTopBar(true);
      return;
    }
    const update = () => {
      setShowTopBar(window.scrollY > 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [news]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) return;
    // Transparent header over image: use dark theme-color so status bar icons stay light.
    meta.content = showTopBar ? "#ffffff" : "#000000";
  }, [showTopBar]);

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
      setSentences(getSentences(news.contId));
    }
  }, [news]);

  useEffect(() => {
    if (!news) return;

    let sessionStart = Date.now();

    const pauseSession = () => {
      if (sessionStart === 0) return;
      const durationMs = Date.now() - sessionStart;
      addReadingSession(news.contId, durationMs);
      const reward = awardNewsReadingPoints(news.contId, news.name, durationMs);
      if (reward.granted && document.visibilityState === "visible") {
        showToast(`+${reward.points} points News read.`, "success");
      }
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
  }, [news, showToast]);

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
      setPendingSentenceText(text);
      setShowSentenceModal(true);
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
    activeSentence: null as typeof activeSentence,
    showSentenceModal: false,
    showBookmarkModal: false,
  });
  backStateRef.current = { dictPopup, activeSentence, showSentenceModal, showBookmarkModal };

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
      if (s.activeSentence) {
        setActiveSentence(null);
        return;
      }
      if (s.showSentenceModal) {
        setShowSentenceModal(false);
        setPendingSentenceText(null);
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
  }, [navigate]);
  // pendingSentenceText: stable copy of selected text so the modal isn't destroyed when
  // selectionPopup is cleared (e.g. by the scroll handler when the mobile keyboard appears).

  const handleSaveSentence = useCallback(
    (category: string, thought?: string) => {
      if (!pendingSentenceText || !news) return;
      addSentence(news.contId, pendingSentenceText, news.name, undefined, undefined, category, thought);
      setSentences(getSentences(news.contId));
      window.getSelection()?.removeAllRanges();
      setPendingSentenceText(null);
      setShowSentenceModal(false);
    },
    [pendingSentenceText, news],
  );

  const handleRemoveSentence = useCallback(
    (highlightId: string) => {
      if (!news) return;
      removeSentence(news.contId, highlightId);
      setSentences(getSentences(news.contId));
      setActiveSentence(null);
    },
    [news],
  );

  const handleUpdateSentence = useCallback(
    (highlightId: string, updates: { thought?: string; category?: string }) => {
      if (!news) return;
      updateSentence(news.contId, highlightId, updates);
      setSentences(getSentences(news.contId));
      // Update the activeSentence state to reflect the saved changes immediately
      setActiveSentence((prev) =>
        prev && prev.id === highlightId
          ? { ...prev, ...updates, thought: updates.thought ?? undefined, category: updates.category ?? prev.category }
          : prev,
      );
    },
    [news],
  );

  const handleShare = useCallback(async () => {
    if (!news || !shareCardRef.current || isSharing) return;
    const authorLabel = news.authorList?.map((a) => a.name).join(", ") || "Seventh Tone";
    const fileName = `seventh-tone-news-${news.contId}.jpg`;

    try {
      setIsSharing(true);
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f8fafc",
        logging: false,
      });

      if (Capacitor.isNativePlatform()) {
        const base64 = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: news.name,
          text: `${news.name} · ${authorLabel}`,
          files: [result.uri],
          dialogTitle: "Share news image",
        });
      } else {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95));
        if (!blob) throw new Error("Failed to create image blob.");

        const file = new File([blob], fileName, { type: "image/jpeg" });
        if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: news.name,
            text: `${news.name} · ${authorLabel}`,
          });
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = fileName;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
        }
      }
    } catch {
      // 用户取消或出错，静默忽略
    } finally {
      setIsSharing(false);
    }
  }, [news, isSharing]);

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
    if (!sanitizedContent || !sentences.length) return sanitizedContent;
    const tmp = document.createElement("div");
    tmp.innerHTML = sanitizedContent;
    const instance = new Mark(tmp);
    const rawText = tmp.textContent || "";
    const occupiedRanges: Array<{ start: number; end: number }> = [];

    for (const h of sentences) {
      const range = findTextRange(rawText, h.text, occupiedRanges);
      if (!range) continue;

      occupiedRanges.push({ start: range.start, end: range.end });
      instance.markRanges([range], {
        className: "news-sentence",
        each: (el) => {
          el.setAttribute("data-sentence-id", h.id);
        },
      });
    }
    return tmp.innerHTML;
  }, [sanitizedContent, sentences]);

  const shareContentHtml = useMemo(() => {
    if (!sanitizedContent) return "";
    return buildShareContentHtml(sanitizedContent);
  }, [sanitizedContent]);

  const handleMarkClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const mark = (e.target as HTMLElement).closest("mark[data-sentence-id]") as HTMLElement | null;
      if (!mark) return;
      e.stopPropagation();
      const hId = mark.getAttribute("data-sentence-id");
      if (hId) {
        // Resolve the sentence object immediately and store it directly.
        // We intentionally do NOT keep an activeSentenceId in state so that
        // the scroll-dismiss handler (which fires when the mobile keyboard
        // appears after the user taps the edit textarea) has nothing to clear.
        const found = sentences.find((h) => h.id === hId) ?? null;
        setActiveSentence(found);
        window.getSelection()?.removeAllRanges();
      }
    },
    [sentences],
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
    if (target.closest("a") || target.closest("mark[data-sentence-id]")) return;
    const hit = getWordAtPoint(e.clientX, e.clientY);
    if (!hit) return;
    // Clear the browser selection before opening the popup.
    window.getSelection()?.removeAllRanges();
    setDictPopup({ x: hit.rect.left + hit.rect.width / 2, y: hit.rect.bottom, word: hit.word });
  }, []);

  // Whether the current popup word is already saved in vocabulary.
  const [wordInVocab, setWordInVocab] = useState(false);
  const [vocabEntryId, setVocabEntryId] = useState<string | null>(null);
  useEffect(() => {
    if (!dictPopup?.word) {
      setWordInVocab(false);
      setVocabEntryId(null);
      return;
    }
    const vocabEntry = getVocab().find((v) => v.word.toLowerCase() === dictPopup.word.toLowerCase());
    setWordInVocab(Boolean(vocabEntry));
    setVocabEntryId(vocabEntry?.id ?? null);
  }, [dictPopup?.word]);

  const handleToggleVocab = useCallback(() => {
    if (!dictPopup?.word) return;
    if (wordInVocab && vocabEntryId) {
      removeVocab(vocabEntryId);
      setWordInVocab(false);
      setVocabEntryId(null);
      return;
    }
    const translations = dictData?.translations?.map((t) => `${t.pos}. ${t.tran_cn}`) ?? [];
    addVocab(dictPopup.word, dictData?.ukphone, translations);
    const vocabEntry = getVocab().find((v) => v.word.toLowerCase() === dictPopup.word.toLowerCase());
    setWordInVocab(true);
    setVocabEntryId(vocabEntry?.id ?? null);
  }, [dictPopup?.word, wordInVocab, vocabEntryId, dictData]);

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
    <div className={`bg-white dark:bg-slate-900 min-h-screen pb-32 overflow-x-hidden ${news?.headPic ? "pt-0" : "pt-14"}`}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Top Navigation */}
      <div
        className={`fixed inset-x-0 top-0 z-50 pt-safe transition-all duration-200 ${
          showTopBar
            ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-700"
            : "bg-transparent border-b border-transparent backdrop-blur-0"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 -ml-2 transition-colors ${
              showTopBar ? "text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400" : "text-white/90 hover:text-white"
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 px-2 text-center">
            <div
              className={`mx-auto max-w-[60vw] truncate text-sm font-semibold transition-opacity ${
                showTopBar ? "text-gray-700 dark:text-gray-200 opacity-100" : "text-white/90 opacity-0"
              }`}
              aria-hidden={!showTopBar}
            >
              {news.name}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              className={`p-2 transition-colors rounded-full ${
                showTopBar
                  ? "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
              aria-label="Share news"
            >
              {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
            </button>
            <button
              onClick={toggleBookmark}
              className={`p-2 transition-colors rounded-full ${
                isBookmarked
                  ? showTopBar
                    ? "text-brand dark:text-emerald-400 bg-brand/10 dark:bg-emerald-500/20 hover:bg-brand/20"
                    : "text-white bg-emerald-500/80 hover:bg-emerald-500"
                  : showTopBar
                    ? "text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10"
                    : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
              aria-label={isBookmarked ? "Unbookmark news" : "Bookmark news"}
            >
              {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>
        </div>
      </div>

      {news.headPic && (
        <section className="relative">
          <img
            src={news.headPic}
            alt={news.name}
            className="w-full h-[34vh] sm:h-[34vh] object-cover bg-gray-100 dark:bg-slate-800"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        </section>
      )}

      <div className={`relative z-10 ${news.headPic ? "-mt-14 sm:-mt-16" : "mt-6"}`}>
        <article className="max-w-3xl mx-auto px-4 pb-16 select-text relative">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-lg shadow-black/5 p-4 sm:p-4">
            {/* Header：标题和 summary 支持点击查词 */}
            <header className="mb-8">
              <h1
                className={`${newsScaleClasses[fontScale].title} font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight mb-6 cursor-text`}
                onDoubleClick={(e) => {
                  if (!(e.target as HTMLElement).closest("a")) handleContentDblClick(e);
                }}
              >
                {news.name}
              </h1>

              <p
                className={`${newsScaleClasses[fontScale].summary} text-gray-600 dark:text-gray-500 font-serif italic mb-8 leading-relaxed cursor-text`}
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
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Clock size={12} className="mr-1" />
                      <time dateTime={news.pubTime}>{news.pubTime}</time>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Content */}
            <div
              ref={contentRef}
              className={`prose ${newsScaleClasses[fontScale].prose} prose-emerald max-w-none overflow-x-hidden break-words prose-p:font-serif prose-p:leading-relaxed prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto [&_iframe]:max-w-full [&_video]:max-w-full [&_svg]:max-w-full [&_*]:break-words select-text`}
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
              onClick={handleMarkClick}
              onDoubleClick={handleContentDblClick}
            />

            {/* AI Practice CTA*/}
            <div className="mt-14 pt-8 border-t border-gray-100 dark:border-slate-800/60">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-100/70 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-900/20 shadow-sm">
                <div className="absolute -top-12 -right-6 h-28 w-28 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
                <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-teal-200/30 blur-3xl dark:bg-emerald-500/10" />
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
                  className="group relative z-10 w-full flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 p-5 sm:p-6"
                >
                  <div className="flex items-center justify-center gap-4 flex-1 min-w-0">
                    <div className="min-w-0 text-center">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/80 dark:text-emerald-300/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Practice Mode
                      </div>
                      <h4 className="mt-2 text-[18px] sm:text-[20px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                        Test Your Understanding
                      </h4>
                      <p className="mt-2 text-[13px] sm:text-[14px] text-gray-700 dark:text-gray-400">
                        Short AI exercises built from this article to lock in vocabulary and key points.
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2 text-[12px] text-gray-700 dark:text-gray-400">
                        <span className="px-2.5 py-1 rounded-full bg-white/90 ring-1 ring-emerald-200 dark:bg-slate-800/70 dark:ring-emerald-500/30">
                          Vocabulary boost
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/90 ring-1 ring-emerald-200 dark:bg-slate-800/70 dark:ring-emerald-500/30">
                          Key points check
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-full sm:w-auto gap-3">
                    <div className="relative">
                      <div className="relative flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
                        <span className="text-[12px] font-bold tracking-[0.2em]">START</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

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
                onClick={handleToggleVocab}
                className={`p-1.5 rounded-full transition-colors ${
                  wordInVocab
                    ? "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    : "text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-600"
                }`}
                aria-label={wordInVocab ? "Remove from vocabulary" : "Add to vocabulary"}
                title={wordInVocab ? "Remove from vocabulary" : "Add to vocabulary"}
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
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Definitions</h4>
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
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Phrases</h4>
                    <ul className="space-y-1.5 list-none pl-0">
                      {dictData.phrases.slice(0, 12).map((p, i) => (
                        <li key={i} className="text-gray-800 dark:text-gray-200">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{p.p_content}</span>
                          <span className="text-gray-500 dark:text-gray-400"> - {p.p_cn}</span>
                        </li>
                      ))}
                      {dictData.phrases.length > 12 && (
                        <li className="text-gray-400 dark:text-gray-500 text-xs">Total {dictData.phrases.length} phrases</li>
                      )}
                    </ul>
                  </section>
                )}
                {/* Related words */}
                {dictData.relWords && dictData.relWords.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Related words</h4>
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
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Synonyms</h4>
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
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Example sentences</h4>
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

      {/* Sentence Detail Modal */}
      {activeSentence && (
        <SentenceDetailModal
          sentence={activeSentence}
          onClose={() => setActiveSentence(null)}
          onDelete={() => handleRemoveSentence(activeSentence.id)}
          onSave={(updates) => handleUpdateSentence(activeSentence.id, updates)}
        />
      )}

      {showBookmarkModal && <BookmarkModal onClose={() => setShowBookmarkModal(false)} onSave={handleSaveBookmark} />}
      {showSentenceModal && pendingSentenceText && (
        <SentenceSaveModal
          selectedText={pendingSentenceText}
          newsTitle={news?.name || "Unknown news"}
          onClose={() => {
            setShowSentenceModal(false);
            setPendingSentenceText(null);
            window.getSelection()?.removeAllRanges();
          }}
          onSave={handleSaveSentence}
        />
      )}

      {news && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "720px",
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <div
            ref={shareCardRef}
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
              fontFamily: SHARE_FONT,
              color: "#0f172a",
              borderRadius: "32px",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.16)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
            }}
          >
            <div style={{ padding: "32px 40px 36px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "#047857",
                  fontFamily: SHARE_FONT,
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", backgroundColor: "#10b981" }} />
                Seventh Tone
              </div>

              <h1 style={{ fontFamily: SHARE_FONT, fontSize: "42px", lineHeight: "50px", fontWeight: 700, margin: "20px 0 16px" }}>{news.name}</h1>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  color: "#475569",
                  fontFamily: SHARE_FONT,
                  fontSize: "18px",
                  lineHeight: "28px",
                  marginBottom: "20px",
                }}
              >
                <span>{news.authorList?.map((a) => a.name).join(", ") || "Seventh Tone"}</span>
                <span>•</span>
                <span>{news.pubTime}</span>
              </div>

              <p style={{ fontFamily: SHARE_FONT, fontSize: "24px", lineHeight: "41px", color: "#334155", margin: 0 }}>{news.summary}</p>

              {shareContentHtml && (
                <div
                  style={{
                    marginTop: "28px",
                    padding: "24px 26px",
                    borderRadius: "24px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                  }}
                  dangerouslySetInnerHTML={{ __html: shareContentHtml }}
                />
              )}

              <div
                style={{
                  marginTop: "30px",
                  paddingTop: "22px",
                  borderTop: "1px solid rgba(148, 163, 184, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  fontFamily: SHARE_FONT,
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", lineHeight: "26px", fontWeight: 700, color: "#0f172a" }}>Seventh Tone</div>
                  <div style={{ fontSize: "16px", lineHeight: "24px", color: "#64748b", marginTop: "6px" }}>Read China with context</div>
                </div>
                <div
                  style={{ fontSize: "16px", lineHeight: "24px", color: "#64748b", textAlign: "right" }}
                >{`${SIXTH_TONE_WEB}/news/${news.contId}`}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
