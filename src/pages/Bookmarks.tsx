import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getBookmarks, getBookmarkCategories, removeBookmark, deleteBookmarkCategory, renameBookmarkCategory } from "../api/bookmarks";
import { getAllSentences, getSentenceCategories, removeSentence, deleteSentenceCategory, renameSentenceCategory } from "../api/sentences";
import { getVocab, removeVocab } from "../api/vocab";
import { Bookmark, Sentence, VocabWord } from "../types";
import type { GroupedItems } from "../components/bookmarks/types";
import { Bookmark as BookmarkIcon, Highlighter, ChevronLeft, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import QuoteModal from "../components/bookmarks/QuoteModal";
import ConfirmModal from "../components/bookmarks/ConfirmModal";
import CollectionEmptyState from "../components/bookmarks/CollectionEmptyState";
import RenameCategoryDialog from "../components/bookmarks/RenameCategoryDialog";
import BookmarkCategoryGrid from "../components/bookmarks/BookmarkCategoryGrid";
import SentenceCategoryGrid from "../components/bookmarks/SentenceCategoryGrid";
import BookmarksGroupedList from "../components/bookmarks/BookmarksGroupedList";
import SentencesGroupedList from "../components/bookmarks/SentencesGroupedList";
import VocabGroupedList from "../components/bookmarks/VocabGroupedList";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";

type ConfirmType = "bookmark" | "sentence" | "vocab" | null;
type TabType = "bookmarks" | "sentences" | "vocabulary";
// "default" = flat all-items list, "grid" = category grid, other string = inside a category
type ViewMode = "default" | "grid" | string;

function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [bookmarkCategories, setBookmarkCategories] = useState<string[]>([]);
  const [highlightCategories, setSentenceCategories] = useState<string[]>([]);

  const [bookmarkView, setBookmarkView] = useState<ViewMode>("grid");
  const [highlightView, setSentenceView] = useState<ViewMode>("grid");

  const [activeQuote, setActiveQuote] = useState<Sentence | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmType; contId?: number; highlightId?: string; vocabId?: string }>({ type: null });
  const [deleteCategoryState, setDeleteCategoryState] = useState<{ tab: TabType; category: string } | null>(null);
  const [renameCategoryState, setRenameCategoryState] = useState<{ tab: TabType; category: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  useEffect(() => {
    reload();
  }, []);

  const reload = () => {
    setBookmarks(getBookmarks());
    setSentences(getAllSentences());
    setVocab(getVocab());
    setBookmarkCategories(getBookmarkCategories());
    setSentenceCategories(getSentenceCategories());
  };

  const currentView = tab === "bookmarks" ? bookmarkView : tab === "sentences" ? highlightView : "default";
  const setCurrentView = (v: ViewMode) => {
    if (tab === "bookmarks") setBookmarkView(v);
    else if (tab === "sentences") setSentenceView(v);
  };

  const TAB_ORDER: TabType[] = ["bookmarks", "sentences", "vocabulary"];

  // Use refs so swipe/back handlers always read latest state without stale closures
  const swipeStateRef = useRef({ currentView, tab });
  swipeStateRef.current = { currentView, tab };
  const setCurrentViewRef = useRef(setCurrentView);
  setCurrentViewRef.current = setCurrentView;
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;

  // Android 物理返回键：分类详情 → 分类格；其他直接返回首页
  useAndroidBackHandler(() => {
    const { currentView: cv, tab: t } = swipeStateRef.current;
    const isInDetail = cv !== "default" && cv !== "grid";
    if (isInDetail) {
      if (t === "bookmarks") setBookmarkView("grid");
      else if (t === "sentences") setSentenceView("grid");
      return;
    }
    navigate("/home");
  });

  // 滑动手势：
  //   - 在分类详情：右滑返回分类格
  //   - 在分类格 / 生词本列表：左右滑切换收藏文章 ↔ 句库 ↔ 生词本
  useEffect(() => {
    const THRESHOLD = 60;
    const ANGLE_RATIO = 1.5;
    let startX = 0,
      startY = 0;

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
  const filteredBookmarks = isDetail ? bookmarks.filter((b) => b.category === currentView) : bookmarks;
  const filteredSentences = isDetail ? sentences.filter((h) => (h.category || "Sentences") === currentView) : sentences;

  // Category data with cover / preview
  const namedBookmarkCats = bookmarkCategories.map((cat) => {
    const items = bookmarks.filter((b) => b.category === cat);
    const cover = items.find((b) => b.news.pic || b.news.appHeadPic)?.news;
    return { name: cat, count: items.length, cover: cover?.pic || cover?.appHeadPic };
  });
  const namedSentenceCats = highlightCategories.map((cat) => {
    const items = sentences.filter((h) => (h.category || "Sentences") === cat);
    return { name: cat, count: items.length, preview: items[0]?.text };
  });

  const onConfirmRemove = () => {
    if (confirmState.type === "bookmark" && confirmState.contId != null) {
      removeBookmark(confirmState.contId);
      reload();
    } else if (confirmState.type === "sentence" && confirmState.contId != null && confirmState.highlightId) {
      removeSentence(confirmState.contId, confirmState.highlightId);
      reload();
    } else if (confirmState.type === "vocab" && confirmState.vocabId) {
      removeVocab(confirmState.vocabId);
      reload();
    }
    setConfirmState({ type: null });
  };
  const onConfirmDeleteCategory = () => {
    if (!deleteCategoryState) return;
    if (deleteCategoryState.tab === "bookmarks") {
      deleteBookmarkCategory(deleteCategoryState.category);
      if (bookmarkView === deleteCategoryState.category) setBookmarkView("grid");
    } else {
      deleteSentenceCategory(deleteCategoryState.category);
      if (highlightView === deleteCategoryState.category) setSentenceView("grid");
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
      renameSentenceCategory(renameCategoryState.category, newName);
      if (highlightView === renameCategoryState.category) setSentenceView(newName);
    }
    reload();
    setRenameCategoryState(null);
  };

  const groupedBookmarks: GroupedItems<Bookmark>[] = groupByDay(filteredBookmarks, (b) => b.CollectedAt);
  const groupedSentences: GroupedItems<Sentence>[] = groupByDay(filteredSentences, (h) => h.createdAt);
  const groupedVocab: GroupedItems<VocabWord>[] = groupByDay(vocab, (v) => v.addedAt);

  const isEmpty = tab === "bookmarks" ? bookmarks.length === 0 : tab === "sentences" ? sentences.length === 0 : vocab.length === 0;
  const showDetailHeader = isDetail && tab !== "vocabulary";

  const renderBookmarksPanel = () => {
    if (bookmarks.length === 0) {
      return (
        <CollectionEmptyState icon={BookmarkIcon} title="No collected news" description="Click the bookmark button on an news to collect it here" />
      );
    }

    return (
      <AnimatePresence mode="wait">
        {bookmarkView === "grid" ? (
          <motion.div
            key="bookmarks-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            <BookmarkCategoryGrid
              categories={namedBookmarkCats}
              onOpen={(name) => setBookmarkView(name)}
              onRename={(name) => openRename("bookmarks", name)}
              onDelete={(name) => setDeleteCategoryState({ tab: "bookmarks", category: name })}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`bookmarks-list-${bookmarkView}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            {bookmarkView !== "default" && filteredBookmarks.length === 0 && (
              <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">This Category is empty.</div>
            )}
            <BookmarksGroupedList groups={groupedBookmarks} onDelete={(contId) => setConfirmState({ type: "bookmark", contId })} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderSentencesPanel = () => {
    if (sentences.length === 0) {
      return (
        <CollectionEmptyState
          icon={Highlighter}
          title="No collected sentences"
          description={'Select text in an news and click "Sentence" to collect it here'}
        />
      );
    }

    return (
      <AnimatePresence mode="wait">
        {highlightView === "grid" ? (
          <motion.div
            key="sentences-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            <SentenceCategoryGrid
              categories={namedSentenceCats}
              onOpen={(name) => setSentenceView(name)}
              onRename={(name) => openRename("sentences", name)}
              onDelete={(name) => setDeleteCategoryState({ tab: "sentences", category: name })}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`sentences-list-${highlightView}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            {highlightView !== "default" && filteredSentences.length === 0 && (
              <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">This Category is empty.</div>
            )}
            <SentencesGroupedList
              groups={groupedSentences}
              onDelete={(contId, highlightId) => setConfirmState({ type: "sentence", contId, highlightId })}
              onOpenQuote={setActiveQuote}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderVocabularyPanel = () => {
    if (vocab.length === 0) {
      return (
        <CollectionEmptyState
          icon={BookOpen}
          title="No collected words"
          description={
            <>
              Tap a word in an news to view its definition, and click <span className="text-brand">+</span> to collect it here
            </>
          }
        />
      );
    }

    return (
      <motion.div key="vocabulary-list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <VocabGroupedList groups={groupedVocab} onDelete={(vocabId) => setConfirmState({ type: "vocab", vocabId })} />
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32">
      {/* 三个 tab：收藏文章 / 句库 / 生词本 */}
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="w-full rounded-none bg-gray-50/80 p-1 dark:bg-slate-800/45">
          <div className="mx-auto flex max-w-4xl px-0">
            {(["bookmarks", "sentences", "vocabulary"] as TabType[]).map((t) => {
              const labels: Record<TabType, string> = { bookmarks: "News", sentences: "Sentences", vocabulary: "Vocabulary" };
              const counts: Record<TabType, number> = { bookmarks: bookmarks.length, sentences: sentences.length, vocabulary: vocab.length };
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 border-b-2 py-3 rounded-none text-xs font-semibold transition-colors ${
                    tab === t
                      ? "border-b-2 border-brand text-gray-900 dark:border-emerald-400 dark:text-gray-100"
                      : "border-b-2 border-transparent text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {labels[t]}
                  {counts[t] > 0 ? ` (${counts[t]})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-4">
        {/* Inside-category header (back button + category name) */}
        {showDetailHeader && (
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView("grid")}
              className="flex items-center justify-center p-0 text-gray-600 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {tab === "bookmarks" ? filteredBookmarks.length : filteredSentences.length} items
            </span>
          </div>
        )}

        {tab === "bookmarks" && renderBookmarksPanel()}
        {tab === "sentences" && renderSentencesPanel()}
        {tab === "vocabulary" && renderVocabularyPanel()}
        {activeQuote && (
          <QuoteModal
            text={activeQuote.text}
            newsTitle={activeQuote.newsName || "Unknown news"}
            author="Seventh Tone"
            onClose={() => setActiveQuote(null)}
          />
        )}

        <ConfirmModal
          open={confirmState.type === "bookmark"}
          onClose={() => setConfirmState({ type: null })}
          onConfirm={onConfirmRemove}
          title="Remove from bookmarks?"
          message="This news will be removed from your collection. You can bookmark it again anytime."
          confirmLabel="Remove"
          variant="danger"
        />
        <ConfirmModal
          open={confirmState.type === "sentence"}
          onClose={() => setConfirmState({ type: null })}
          onConfirm={onConfirmRemove}
          title="Remove this sentence?"
          message="This sentence will be deleted and cannot be restored."
          confirmLabel="Remove"
          variant="danger"
        />
        <ConfirmModal
          open={confirmState.type === "vocab"}
          onClose={() => setConfirmState({ type: null })}
          onConfirm={onConfirmRemove}
          title="Remove from vocabulary?"
          message="This word will be removed from your vocabulary."
          confirmLabel="Remove"
          variant="danger"
        />
        <ConfirmModal
          open={deleteCategoryState !== null}
          onClose={() => setDeleteCategoryState(null)}
          onConfirm={onConfirmDeleteCategory}
          title={deleteCategoryState ? `Delete category "${deleteCategoryState.category}"?` : ""}
          message="All items in this category will be permanently deleted and cannot be recovered."
          confirmLabel="Delete"
          variant="danger"
        />

        {/* Rename category dialog */}
        {renameCategoryState && (
          <RenameCategoryDialog
            category={renameCategoryState.category}
            value={renameInput}
            onChange={setRenameInput}
            onCancel={() => setRenameCategoryState(null)}
            onConfirm={onConfirmRenameCategory}
          />
        )}
      </div>
    </motion.div>
  );
}
