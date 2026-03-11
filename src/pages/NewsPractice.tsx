import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Brain, RotateCcw, LayoutGrid, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import {
  generateExercises,
  evaluateTranslations,
  evaluateSummary,
  prepareNewsText,
  type ExerciseSet,
  type TranslationEval,
  type SummaryEvaluation,
} from "../api/llm";
import { awardPracticeAnswerPoints, awardPracticeCompletionPoints, type PointsAwardResult } from "../api/points";
import { useBottomToast } from "../utils/toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type QEntry =
  | { type: "vocab"; idx: number }
  | { type: "comp"; idx: number }
  | { type: "en2cn"; idx: number }
  | { type: "cn2en"; idx: number }
  | { type: "summary" };

type AnswerStatus = "unanswered" | "correct" | "wrong" | "answered";

const LABELS = ["A", "B", "C", "D"];

const SECTION_META: Record<QEntry["type"], { label: string; short: string; accent: string; ring: string; bg: string; badge: string }> = {
  vocab: {
    label: "Vocabulary",
    short: "Vocab",
    accent: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  },
  comp: {
    label: "Comprehension",
    short: "Comp",
    accent: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  },
  en2cn: {
    label: "Translate to Chinese",
    short: "EN to CN",
    accent: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  },
  cn2en: {
    label: "Translate to English",
    short: "CN to EN",
    accent: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  },
  summary: {
    label: "Summary Writing",
    short: "Summary",
    accent: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  },
};

// ─── Option button helpers ────────────────────────────────────────────────────
function optionCls(answered: boolean, isSelected: boolean, isCorrect: boolean): string {
  const base =
    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 dark:focus-visible:ring-emerald-500/40";
  if (!answered)
    return `${base} border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 active:scale-[0.985] hover:border-gray-300 dark:hover:border-slate-500`;
  if (isSelected && isCorrect) return `${base} border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30`;
  if (isSelected && !isCorrect) return `${base} border-red-400 bg-red-50 dark:bg-red-900/20`;
  if (!isSelected && isCorrect) return `${base} border-emerald-400 border-dashed bg-emerald-50/40 dark:bg-emerald-900/10`;
  return `${base} border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-40`;
}

function badgeCls(answered: boolean, isSelected: boolean, isCorrect: boolean): string {
  const base = "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold";
  if (!answered) return `${base} bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300`;
  if (isCorrect) return `${base} bg-emerald-500 text-white`;
  if (isSelected) return `${base} bg-red-500 text-white`;
  return `${base} bg-gray-200 dark:bg-slate-600 text-gray-400`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NewsPractice() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useBottomToast();
  const state = location.state as { title?: string; contentHtml?: string } | null;
  const articleId = Number(params.id ?? 0);
  const title = state?.title ?? "Practice";
  const contentHtml = state?.contentHtml ?? "";

  // ── Phase & data ──────────────────────────────────────────────────────────
  type Phase = "loading" | "questions";
  const [phase, setPhase] = useState<Phase>("loading");
  const [exercises, setExercises] = useState<ExerciseSet | null>(null);
  const [loadError, setLoadError] = useState("");

  // ── Navigation ────────────────────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showSheet, setShowSheet] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchIsH = useRef<boolean | null>(null);

  // ── Answers ───────────────────────────────────────────────────────────────
  const [vocabAnswers, setVocabAnswers] = useState<Record<string, string>>({});
  const [compAnswers, setCompAnswers] = useState<Record<string, number>>({});
  const [translTexts, setTranslTexts] = useState<Record<string, string>>({});
  const [translRevealed, setTranslRevealed] = useState<Set<string>>(new Set());
  /** Per-question AI evaluations — populated when user checks reference answer */
  const [translEvals, setTranslEvals] = useState<Record<string, TranslationEval>>({});
  const [translEvalLoading, setTranslEvalLoading] = useState<Set<string>>(new Set());
  const [summaryText, setSummaryText] = useState("");
  const [summaryRevealed, setSummaryRevealed] = useState(false);
  /** Summary AI feedback — evaluated inline on the summary card */
  const [summaryEval, setSummaryEval] = useState<SummaryEvaluation | null>(null);
  const [summaryEvalLoading, setSummaryEvalLoading] = useState(false);

  // ── Derived: flat question list ───────────────────────────────────────────
  const questions = useMemo((): QEntry[] => {
    if (!exercises) return [];
    return [
      ...exercises.vocabulary.map((_, i): QEntry => ({ type: "vocab", idx: i })),
      ...exercises.comprehension.map((_, i): QEntry => ({ type: "comp", idx: i })),
      ...exercises.en2cn.map((_, i): QEntry => ({ type: "en2cn", idx: i })),
      ...exercises.cn2en.map((_, i): QEntry => ({ type: "cn2en", idx: i })),
      { type: "summary" },
    ];
  }, [exercises]);

  const currentEntry = questions[currentIdx] ?? null;

  // ── Status helper ─────────────────────────────────────────────────────────
  const getStatus = useCallback(
    (entry: QEntry): AnswerStatus => {
      if (!exercises) return "unanswered";
      switch (entry.type) {
        case "vocab": {
          const q = exercises.vocabulary[entry.idx];
          if (!vocabAnswers[q.id]) return "unanswered";
          return vocabAnswers[q.id] === q.answer ? "correct" : "wrong";
        }
        case "comp": {
          const q = exercises.comprehension[entry.idx];
          if (compAnswers[q.id] === undefined) return "unanswered";
          return compAnswers[q.id] === q.answer ? "correct" : "wrong";
        }
        case "en2cn": {
          const q = exercises.en2cn[entry.idx];
          return translTexts[q.id]?.trim() ? "answered" : "unanswered";
        }
        case "cn2en": {
          const q = exercises.cn2en[entry.idx];
          return translTexts[q.id]?.trim() ? "answered" : "unanswered";
        }
        case "summary":
          return summaryText.trim() ? "answered" : "unanswered";
      }
    },
    [exercises, vocabAnswers, compAnswers, translTexts, summaryText],
  );

  // ── canGoNext: MCQ requires answer first ──────────────────────────────────
  const canGoNext = useMemo(() => {
    if (!exercises || !currentEntry) return false;
    if (currentEntry.type === "vocab") {
      return Boolean(vocabAnswers[exercises.vocabulary[currentEntry.idx]?.id]);
    }
    if (currentEntry.type === "comp") {
      return compAnswers[exercises.comprehension[currentEntry.idx]?.id] !== undefined;
    }
    return true; // translation / summary: always passable
  }, [exercises, currentEntry, vocabAnswers, compAnswers]);

  const isSubjectiveEntry = useCallback((entry: QEntry | null): entry is Extract<QEntry, { type: "en2cn" | "cn2en" | "summary" }> => {
    return !!entry && (entry.type === "en2cn" || entry.type === "cn2en" || entry.type === "summary");
  }, []);

  const isSubjectiveReadyForNext = useCallback(
    (entry: Extract<QEntry, { type: "en2cn" | "cn2en" | "summary" }> | null) => {
      if (!entry || !exercises) return false;
      if (entry.type === "summary") {
        const hasText = summaryText.trim().length > 0;
        return summaryRevealed && (!hasText || (!!summaryEval && !summaryEvalLoading));
      }
      const q = entry.type === "en2cn" ? exercises.en2cn[entry.idx] : exercises.cn2en[entry.idx];
      const hasText = (translTexts[q.id] ?? "").trim().length > 0;
      return translRevealed.has(q.id) && (!hasText || (!!translEvals[q.id] && !translEvalLoading.has(q.id)));
    },
    [exercises, summaryText, summaryRevealed, summaryEval, summaryEvalLoading, translTexts, translRevealed, translEvals, translEvalLoading],
  );

  const currentIsSubjective = isSubjectiveEntry(currentEntry);
  const currentSubjectiveReadyForNext = currentIsSubjective ? isSubjectiveReadyForNext(currentEntry) : false;
  const answeredCount = useMemo(() => questions.filter((entry) => getStatus(entry) !== "unanswered").length, [questions, getStatus]);

  const notifyPointsAward = useCallback(
    (result: PointsAwardResult) => {
      if (!result.granted) return;
      showToast(`+${result.points} points ${result.transaction?.title ?? "Reward earned"}`, "success");
    },
    [showToast],
  );

  // ── Answer card sections ──────────────────────────────────────────────────
  const sheetSections = useMemo(() => {
    if (!exercises) return [];
    let offset = 0;
    const sections: Array<{
      type: QEntry["type"];
      entries: Array<{ entry: QEntry; globalIdx: number }>;
    }> = [];
    const push = (type: QEntry["type"], count: number, makeEntry: (i: number) => QEntry) => {
      if (count === 0) return;
      sections.push({
        type,
        entries: Array.from({ length: count }, (_, i) => ({
          entry: makeEntry(i),
          globalIdx: offset + i,
        })),
      });
      offset += count;
    };
    push("vocab", exercises.vocabulary.length, (i) => ({ type: "vocab", idx: i }));
    push("comp", exercises.comprehension.length, (i) => ({ type: "comp", idx: i }));
    push("en2cn", exercises.en2cn.length, (i) => ({ type: "en2cn", idx: i }));
    push("cn2en", exercises.cn2en.length, (i) => ({ type: "cn2en", idx: i }));
    // summary
    sections.push({
      type: "summary",
      entries: [{ entry: { type: "summary" }, globalIdx: offset }],
    });
    return sections;
  }, [exercises]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const jumpTo = useCallback(
    (idx: number) => {
      if (idx > currentIdx && currentIsSubjective && !currentSubjectiveReadyForNext) {
        setShowSheet(false);
        return;
      }
      setNavDir(idx > currentIdx ? 1 : -1);
      setCurrentIdx(idx);
      setShowSheet(false);
    },
    [currentIdx, currentIsSubjective, currentSubjectiveReadyForNext],
  );

  const goPrev = useCallback(() => {
    if (currentIdx === 0) return;
    setNavDir(-1);
    setCurrentIdx((i) => i - 1);
  }, [currentIdx]);

  const goNext = useCallback(() => {
    if (currentIsSubjective && !currentSubjectiveReadyForNext) return;
    if (currentIdx < questions.length - 1) {
      setNavDir(1);
      setCurrentIdx((i) => i + 1);
    }
  }, [currentIdx, questions.length, currentIsSubjective, currentSubjectiveReadyForNext]);

  // ── Answer handlers ───────────────────────────────────────────────────────
  const handleVocabAnswer = useCallback(
    (qId: string, option: string) => {
      if (vocabAnswers[qId]) return;
      const isCorrect = exercises?.vocabulary.find((item) => item.id === qId)?.answer === option;
      notifyPointsAward(
        awardPracticeAnswerPoints({
          articleId,
          articleTitle: title,
          questionId: qId,
          sectionTitle: SECTION_META.vocab.label,
          isCorrect,
        }),
      );
      setVocabAnswers((prev) => ({ ...prev, [qId]: option }));
    },
    [vocabAnswers, exercises, notifyPointsAward, articleId, title],
  );

  const handleCompAnswer = useCallback(
    (qId: string, idx: number) => {
      if (compAnswers[qId] !== undefined) return;
      const isCorrect = exercises?.comprehension.find((item) => item.id === qId)?.answer === idx;
      notifyPointsAward(
        awardPracticeAnswerPoints({
          articleId,
          articleTitle: title,
          questionId: qId,
          sectionTitle: SECTION_META.comp.label,
          isCorrect,
        }),
      );
      setCompAnswers((prev) => ({ ...prev, [qId]: idx }));
    },
    [compAnswers, exercises, notifyPointsAward, articleId, title],
  );

  const handleSubmitTranslation = useCallback(
    async (entry: Extract<QEntry, { type: "en2cn" | "cn2en" }>) => {
      if (!exercises) return;
      const q = entry.type === "en2cn" ? exercises.en2cn[entry.idx] : exercises.cn2en[entry.idx];
      const trimmed = (translTexts[q.id] ?? "").trim();

      setTranslRevealed((prev) => new Set([...prev, q.id]));

      if (!trimmed || translEvalLoading.has(q.id) || translEvals[q.id]) return;

      setTranslEvalLoading((prev) => new Set([...prev, q.id]));
      try {
        const results = await evaluateTranslations([
          {
            id: q.id,
            direction: entry.type,
            source: q.sourceText,
            userAnswer: trimmed,
            modelAnswer: q.modelAnswer,
          },
        ]);
        if (results[0]) {
          setTranslEvals((prev) => ({ ...prev, [q.id]: results[0] }));
        }
      } catch {
        setTranslEvals((prev) => ({
          ...prev,
          [q.id]: {
            id: q.id,
            score: 0,
            feedback: "AI feedback is temporarily unavailable. Please compare your answer with the reference version.",
            improved: q.modelAnswer,
          },
        }));
      } finally {
        notifyPointsAward(
          awardPracticeAnswerPoints({
            articleId,
            articleTitle: title,
            questionId: q.id,
            sectionTitle: SECTION_META[entry.type].label,
            isSubjective: true,
          }),
        );
        setTranslEvalLoading((prev) => {
          const next = new Set(prev);
          next.delete(q.id);
          return next;
        });
      }
    },
    [exercises, translTexts, translEvalLoading, translEvals, notifyPointsAward, articleId, title],
  );

  // ── Inline summary evaluation ─────────────────────────────────────────────
  const handleSubmitSummary = useCallback(async () => {
    const trimmed = summaryText.trim();
    setSummaryRevealed(true);
    if (!trimmed || summaryEvalLoading || summaryEval) return;

    setSummaryEvalLoading(true);
    try {
      const result = await evaluateSummary(prepareNewsText(contentHtml), trimmed);
      setSummaryEval(result);
    } catch {
      setSummaryEval({
        score: 0,
        grammar: "AI feedback is temporarily unavailable. Start by checking sentence clarity against the reference summary.",
        content: "Make sure your summary covers the main angle, key facts, and impact of the story.",
        vocabulary: "Prefer precise, concise wording that sounds natural in news English.",
        improved: exercises?.modelSummary ?? "",
      });
    } finally {
      notifyPointsAward(
        awardPracticeAnswerPoints({
          articleId,
          articleTitle: title,
          questionId: "summary",
          sectionTitle: SECTION_META.summary.label,
          isSubjective: true,
        }),
      );
      setSummaryEvalLoading(false);
    }
  }, [summaryText, summaryEvalLoading, summaryEval, contentHtml, exercises?.modelSummary, notifyPointsAward, articleId, title]);

  const handleSubmitCurrentSubjective = useCallback(async () => {
    if (!currentEntry || !isSubjectiveEntry(currentEntry)) return;
    if (currentEntry.type === "summary") {
      await handleSubmitSummary();
      return;
    }
    await handleSubmitTranslation(currentEntry);
  }, [currentEntry, isSubjectiveEntry, handleSubmitSummary, handleSubmitTranslation]);

  // ── Load exercises ────────────────────────────────────────────────────────
  const startGeneration = useCallback(() => {
    if (!contentHtml) {
      setLoadError("No news content. Please go back and try again.");
      return;
    }
    setLoadError("");
    setPhase("loading");
    generateExercises(title, prepareNewsText(contentHtml))
      .then((ex) => {
        setExercises(ex);
        setPhase("questions");
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Generation failed");
      });
  }, [title, contentHtml]);

  useEffect(() => {
    startGeneration();
  }, []);

  useEffect(() => {
    if (!Number.isFinite(articleId) || articleId <= 0) return;
    notifyPointsAward(
      awardPracticeCompletionPoints({
        articleId,
        articleTitle: title,
        totalQuestions: questions.length,
        answeredQuestions: answeredCount,
      }),
    );
  }, [articleId, title, questions.length, answeredCount, notifyPointsAward]);

  // ── Back button ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener("backButton", () => {
      if (showSheet) {
        setShowSheet(false);
        return;
      }
      navigate(-1);
    });
    return () => {
      listener.then((h) => h.remove());
    };
  }, [navigate, showSheet]);

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;

  // ── Scores ────────────────────────────────────────────────────────────────
  const vocabCorrect = exercises ? exercises.vocabulary.filter((q) => vocabAnswers[q.id] === q.answer).length : 0;
  const compCorrect = exercises ? exercises.comprehension.filter((q) => compAnswers[q.id] === q.answer).length : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE: LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center px-6 pt-safe">
        {loadError ? (
          <div className="max-w-sm w-full text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Generation Failed</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{loadError}</p>
            <button
              onClick={startGeneration}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand dark:bg-emerald-600 text-white rounded-full font-semibold text-sm"
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Brain className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Preparing Practice</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Generating personalized exercises…</p>
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
          </div>
        )}
      </div>
    );
  }

  if (!exercises || !currentEntry) return null;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SHARED: TOP BAR
  // ═══════════════════════════════════════════════════════════════════════════
  const topBar = (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/60 pt-safe shadow-[0_6px_20px_-18px_rgba(0,0,0,0.5)]">
      <div className="max-w-2xl mx-auto px-3 h-14 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors shrink-0"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0 px-1">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{title}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
              {currentIdx + 1}/{questions.length}
            </p>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-400" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="p-2 -mr-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors shrink-0"
          aria-label="Answer sheet"
        >
          <LayoutGrid size={20} />
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  ANSWER SHEET DRAWER
  // ═══════════════════════════════════════════════════════════════════════════
  const statusDotCls = (status: AnswerStatus) => {
    if (status === "correct") return "bg-emerald-500 text-white";
    if (status === "wrong") return "bg-red-500 text-white";
    if (status === "answered") return "bg-blue-500 text-white";
    return "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500";
  };

  const answerSheet = (
    <AnimatePresence>
      {showSheet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowSheet(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">答题卡 · Answer Sheet</h3>
              <button onClick={() => setShowSheet(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-72 overflow-y-auto">
              {sheetSections.map((section) => {
                const meta = SECTION_META[section.type];
                return (
                  <div key={section.type}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${meta.accent}`}>{meta.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {section.entries.map(({ entry, globalIdx }, i) => {
                        const status = getStatus(entry);
                        const isCurrent = currentIdx === globalIdx;
                        return (
                          <button
                            key={i}
                            onClick={() => jumpTo(globalIdx)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${statusDotCls(status)} ${isCurrent ? `ring-2 ring-offset-2 ${meta.ring}` : ""}`}
                          >
                            {section.type === "summary" ? "S" : i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100 dark:border-slate-700">
                {[
                  { cls: "bg-emerald-500", label: "Correct" },
                  { cls: "bg-red-500", label: "Wrong" },
                  { cls: "bg-blue-500", label: "Answered" },
                  { cls: "bg-gray-100 dark:bg-slate-700", label: "Pending" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${cls}`} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  BOTTOM NAV (shared across all question types)
  // ═══════════════════════════════════════════════════════════════════════════
  const isLastQ = currentIdx === questions.length - 1;
  const currentSubjectiveBusy =
    currentIsSubjective && currentEntry.type !== "summary"
      ? exercises
        ? translEvalLoading.has((currentEntry.type === "en2cn" ? exercises.en2cn[currentEntry.idx] : exercises.cn2en[currentEntry.idx]).id)
        : false
      : summaryEvalLoading;

  const currentPrimaryLabel = currentIsSubjective
    ? currentSubjectiveReadyForNext
      ? isLastQ
        ? "Done"
        : "Next"
      : currentSubjectiveBusy
        ? "Checking..."
        : "View "
    : isLastQ
      ? "Done"
      : "Next";

  const bottomNav = (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-700/60 pb-safe shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.5)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Previous */}
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        {/* Section indicator */}
        <div className="flex-1 flex justify-center">
          <span className={`text-xs font-bold uppercase tracking-wider ${SECTION_META[currentEntry.type].accent}`}>
            {SECTION_META[currentEntry.type].short}
          </span>
        </div>

        {/* Next / Done */}
        {!currentIsSubjective && isLastQ ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-brand dark:bg-emerald-600 text-white hover:bg-brand/90 transition-colors shadow-sm shadow-emerald-500/20"
          >
            Done <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={async () => {
              if (currentIsSubjective) {
                if (currentSubjectiveReadyForNext) {
                  if (isLastQ) navigate(-1);
                  else goNext();
                  return;
                }
                await handleSubmitCurrentSubjective();
                return;
              }
              goNext();
            }}
            disabled={currentIsSubjective ? currentSubjectiveBusy : !canGoNext}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-bold bg-brand dark:bg-emerald-600 text-white disabled:opacity-30 hover:bg-brand/90 transition-colors shadow-sm shadow-emerald-500/20"
          >
            {currentPrimaryLabel} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE: QUESTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Shared: subjective result cards ─────────────────────────────────────
  const getScoreLevel = (score: number) => {
    if (score >= 85) return "优秀";
    if (score >= 70) return "良好";
    if (score >= 60) return "合格";
    return "待提升";
  };

  const renderReferenceCard = (answer: string) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">参考答案</p>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{answer}</p>
      </div>
    </motion.div>
  );

  const renderAiScoreCard = (score: number, reasons: Array<{ label?: string; text: string }>) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold text-sm shrink-0 ${
            score >= 80 ? "bg-emerald-500 text-white" : score >= 60 ? "bg-amber-400 text-white" : "bg-red-400 text-white"
          }`}
        >
          <span className="leading-none">{score}</span>
          <span className="text-[10px] leading-none mt-0.5">分</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">AI评分</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">评级：{getScoreLevel(score)}</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {reasons.map(({ label, text }, i) => (
          <div key={i}>
            {label && <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderSuggestionCard = (content: string) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm"
    >
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">优化建议</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );

  const renderSectionBadge = (entry: QEntry) => {
    const meta = SECTION_META[entry.type];
    const num =
      entry.type !== "summary"
        ? `${(entry as { idx: number }).idx + 1}/${
            entry.type === "vocab"
              ? exercises.vocabulary.length
              : entry.type === "comp"
                ? exercises.comprehension.length
                : entry.type === "en2cn"
                  ? exercises.en2cn.length
                  : exercises.cn2en.length
          }`
        : null;
    return (
      <div className="flex items-center justify-between mb-5">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
        {num && <span className="text-xs text-gray-400 dark:text-gray-500">{num}</span>}
      </div>
    );
  };

  // ─── Vocab question ───────────────────────────────────────────────────────
  const renderVocab = (entry: Extract<QEntry, { type: "vocab" }>) => {
    const q = exercises.vocabulary[entry.idx];
    const selected = vocabAnswers[q.id];
    const answered = Boolean(selected);
    const correct = selected === q.answer;

    return (
      <div className="space-y-4">
        {renderSectionBadge(entry)}

        {/* Sentence card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
            {q.sentence.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span
                    className={`inline-block min-w-[88px] border-b-2 mx-1 px-2 text-center font-semibold transition-colors ${
                      answered
                        ? correct
                          ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500 text-red-600 dark:text-red-400"
                        : "border-gray-300 dark:border-gray-500 text-transparent"
                    }`}
                  >
                    {answered ? selected : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSel = selected === opt;
            const isCorr = opt === q.answer;
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => handleVocabAnswer(q.id, opt)}
                className={optionCls(answered, isSel, isCorr)}
              >
                <span className={badgeCls(answered, isSel, isCorr)}>{LABELS[i]}</span>
                <span
                  className={`text-sm font-medium ${
                    answered && isCorr
                      ? "text-emerald-700 dark:text-emerald-400"
                      : answered && isSel
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {opt}
                </span>
                {answered && isCorr && <CheckCircle2 className="ml-auto shrink-0 text-emerald-500" size={17} />}
                {answered && isSel && !isCorr && <XCircle className="ml-auto shrink-0 text-red-500" size={17} />}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 border ${
                correct
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Explanation</span>
              </div>
              <p
                className={`text-sm font-semibold mb-1 ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {correct ? "✓ Correct!" : `✗ The answer is "${q.answer}"`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── Comprehension question ───────────────────────────────────────────────
  const renderComp = (entry: Extract<QEntry, { type: "comp" }>) => {
    const q = exercises.comprehension[entry.idx];
    const selectedIdx = compAnswers[q.id];
    const answered = selectedIdx !== undefined;
    const correct = selectedIdx === q.answer;

    return (
      <div className="space-y-4">
        {renderSectionBadge(entry)}

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSel = selectedIdx === i;
            const isCorr = i === q.answer;
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => handleCompAnswer(q.id, i)}
                className={optionCls(answered, isSel, isCorr)}
              >
                <span className={badgeCls(answered, isSel, isCorr)}>{LABELS[i]}</span>
                <span
                  className={`text-sm ${
                    answered && isCorr
                      ? "font-medium text-emerald-700 dark:text-emerald-400"
                      : answered && isSel
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {opt}
                </span>
                {answered && isCorr && <CheckCircle2 className="ml-auto shrink-0 text-emerald-500" size={17} />}
                {answered && isSel && !isCorr && <XCircle className="ml-auto shrink-0 text-red-500" size={17} />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 border ${
                correct
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Explanation</span>
              </div>
              <p
                className={`text-sm font-semibold mb-1 ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {correct ? "✓ Correct!" : `✗ The answer is "${q.options[q.answer]}"`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── Translation question ─────────────────────────────────────────────────
  const renderTranslation = (entry: Extract<QEntry, { type: "en2cn" | "cn2en" }>) => {
    const q = entry.type === "en2cn" ? exercises.en2cn[entry.idx] : exercises.cn2en[entry.idx];
    const userText = translTexts[q.id] ?? "";
    const revealed = translRevealed.has(q.id);
    const isEn2Cn = entry.type === "en2cn";
    const evalResult = translEvals[q.id];
    const isEvalLoading = translEvalLoading.has(q.id);
    const hasText = userText.trim().length > 0;

    return (
      <div className="space-y-4">
        {renderSectionBadge(entry)}

        {/* Source text */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className={`text-base leading-relaxed ${isEn2Cn ? "italic text-gray-800 dark:text-gray-100" : "text-gray-800 dark:text-gray-100"}`}>
            {q.sourceText}
          </p>
        </div>

        {/* Input */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Your translation</p>
          <textarea
            value={userText}
            onChange={(e) => setTranslTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
            disabled={revealed}
            placeholder={isEn2Cn ? "在此输入中文翻译…" : "Write your English translation here…"}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-gray-50 disabled:dark:bg-slate-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-emerald-500 resize-none transition-colors"
          />
        </div>

        {/* Reference + result (after reveal) */}
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {renderReferenceCard(q.modelAnswer)}
            {isEvalLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-1">
                <Loader2 size={14} className="animate-spin" />
                <span>AI checking…</span>
              </div>
            )}
            {hasText && evalResult && !isEvalLoading && renderAiScoreCard(evalResult.score, [{ text: evalResult.feedback }])}
            {hasText && evalResult && !isEvalLoading && renderSuggestionCard(evalResult.improved)}
          </motion.div>
        )}
      </div>
    );
  };

  // ─── Summary ──────────────────────────────────────────────────────────────
  const renderSummary = () => {
    const wordCount = summaryText.trim() ? summaryText.trim().split(/\s+/).length : 0;
    const locked = summaryRevealed || summaryEvalLoading;
    const hasText = summaryText.trim().length > 0;

    return (
      <div className="space-y-4">
        {renderSectionBadge({ type: "summary" })}

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Write an English summary of this news (3–5 sentences).</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Cover the main points, key facts, and any significant implication.</p>
        </div>

        <div>
          <textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            disabled={locked}
            placeholder="Write your English summary here…"
            rows={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-gray-50 disabled:dark:bg-slate-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-emerald-500 resize-none transition-colors"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </p>
        </div>

        {summaryRevealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {renderReferenceCard(exercises.modelSummary)}
            {summaryEvalLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-1">
                <Loader2 size={14} className="animate-spin" />
                <span>AI checking…</span>
              </div>
            )}
            {hasText &&
              summaryEval &&
              !summaryEvalLoading &&
              renderAiScoreCard(summaryEval.score, [
                { label: "语法", text: summaryEval.grammar },
                { label: "内容", text: summaryEval.content },
                { label: "词汇", text: summaryEval.vocabulary },
              ])}
            {hasText && summaryEval && !summaryEvalLoading && renderSuggestionCard(summaryEval.improved || exercises.modelSummary)}
          </motion.div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE: QUESTIONS (main)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-slate-900 touch-pan-y"
      onTouchStart={(e) => {
        if (showSheet) return;
        if ((e.target as HTMLElement).closest("textarea")) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchIsH.current = null;
      }}
      onTouchMove={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (touchIsH.current === null) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          touchIsH.current = Math.abs(dx) > Math.abs(dy);
        }
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const wasH = touchIsH.current;
        touchStartX.current = null;
        touchStartY.current = null;
        touchIsH.current = null;
        if (!wasH) return;
        if (dx < -50) goNext();
        else if (dx > 50) goPrev();
      }}
    >
      {topBar}
      {answerSheet}

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: navDir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -navDir * 24 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {currentEntry.type === "vocab" && renderVocab(currentEntry)}
            {currentEntry.type === "comp" && renderComp(currentEntry)}
            {(currentEntry.type === "en2cn" || currentEntry.type === "cn2en") && renderTranslation(currentEntry)}
            {currentEntry.type === "summary" && renderSummary()}
          </motion.div>
        </AnimatePresence>
      </div>

      {bottomNav}
    </div>
  );
}
