import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, CheckCircle2, XCircle, Brain, RotateCcw } from "lucide-react";
import {
  generateExercises,
  evaluateTranslations,
  evaluateSummary,
  prepareNewsText,
  type ExerciseSet,
  type TranslationEval,
  type SummaryEvaluation,
} from "../api/llm";
import { getNewsDetail } from "../api/news";
import { awardPracticeAnswerPoints, awardPracticeCompletionPoints, type PointsAwardResult } from "../api/points";
import { useBottomToast } from "../utils/toast";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";
import PracticeTopBar from "../components/practice/PracticeTopBar";
import PracticeAnswerSheet from "../components/practice/PracticeAnswerSheet";
import PracticeBottomNav from "../components/practice/PracticeBottomNav";
import VocabQuestionCard from "../components/practice/VocabQuestionCard";
import ComprehensionQuestionCard from "../components/practice/ComprehensionQuestionCard";
import TranslationQuestionCard from "../components/practice/TranslationQuestionCard";
import SummaryQuestionCard from "../components/practice/SummaryQuestionCard";
import { type AnswerStatus, type PracticeEntryType, type PracticeSectionMeta, type PracticeSheetSection } from "../components/practice/types";
// ─── Types ────────────────────────────────────────────────────────────────────
type QEntry =
  | { type: "vocab"; idx: number }
  | { type: "comp"; idx: number }
  | { type: "en2cn"; idx: number }
  | { type: "cn2en"; idx: number }
  | { type: "summary" };

const LABELS = ["A", "B", "C", "D"];

const SECTION_META: Record<PracticeEntryType, PracticeSectionMeta> = {
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
  const state = location.state as { title?: string } | null;
  const articleId = Number(params.id ?? 0);
  const [articleTitle, setArticleTitle] = useState(state?.title ?? "Practice");
  const [contentHtml, setContentHtml] = useState("");
  const [articleLoading, setArticleLoading] = useState(true);
  const title = articleTitle || "Practice";

  // ── Phase & data ──────────────────────────────────────────────────────────
  type Phase = "loading" | "questions";
  const [phase, setPhase] = useState<Phase>("loading");
  const [exercises, setExercises] = useState<ExerciseSet | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadArticle = useCallback(() => {
    if (!Number.isFinite(articleId) || articleId <= 0) {
      setLoadError("Invalid article id.");
      setArticleLoading(false);
      return;
    }

    setArticleLoading(true);
    setPhase("loading");
    setLoadError("");

    getNewsDetail(String(articleId))
      .then((res) => {
        let detailData = res?.data;
        if (detailData && detailData.data && detailData.contId === undefined) {
          detailData = detailData.data;
        }

        if (!detailData?.content) {
          throw new Error("Failed to load practice article.");
        }

        setArticleTitle(detailData.name || state?.title || "Practice");
        setContentHtml(detailData.content);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load practice article.");
      })
      .finally(() => {
        setArticleLoading(false);
      });
  }, [articleId, state?.title]);

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
    const sections: PracticeSheetSection<QEntry>[] = [];
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
    loadArticle();
  }, [loadArticle]);

  useEffect(() => {
    if (articleLoading || !contentHtml) return;
    startGeneration();
  }, [articleLoading, contentHtml, startGeneration]);

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
  useAndroidBackHandler(() => {
    if (showSheet) {
      setShowSheet(false);
      return;
    }
    navigate(-1);
  });

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;

  // ── Scores ────────────────────────────────────────────────────────────────
  const vocabCorrect = exercises ? exercises.vocabulary.filter((q) => vocabAnswers[q.id] === q.answer).length : 0;
  const compCorrect = exercises ? exercises.comprehension.filter((q) => compAnswers[q.id] === q.answer).length : 0;

  const isLastQ = currentIdx === questions.length - 1;
  const currentSubjectiveBusy =
    currentIsSubjective && currentEntry && currentEntry.type !== "summary" && exercises
      ? translEvalLoading.has((currentEntry.type === "en2cn" ? exercises.en2cn[currentEntry.idx] : exercises.cn2en[currentEntry.idx]).id)
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
  const handlePrimaryAction = useCallback(async () => {
    if (currentIsSubjective) {
      if (currentSubjectiveReadyForNext) {
        if (isLastQ) {
          navigate(-1);
          return;
        }
        goNext();
        return;
      }
      await handleSubmitCurrentSubjective();
      return;
    }
    goNext();
  }, [currentIsSubjective, currentSubjectiveReadyForNext, isLastQ, navigate, goNext, handleSubmitCurrentSubjective]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PHASE: LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  if (articleLoading || phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center px-6 pt-safe">
        {loadError ? (
          <div className="max-w-sm w-full text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Generation Failed</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{loadError}</p>
            <button
              onClick={contentHtml ? startGeneration : loadArticle}
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
  // ═══════════════════════════════════════════════════════════════════════════
  //  BOTTOM NAV (shared across all question types)
  // ═══════════════════════════════════════════════════════════════════════════

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
    const question = exercises.vocabulary[entry.idx];
    return (
      <VocabQuestionCard
        question={question}
        selected={vocabAnswers[question.id]}
        labelOptions={LABELS}
        sectionBadge={renderSectionBadge(entry)}
        optionClassName={optionCls}
        badgeClassName={badgeCls}
        onAnswer={handleVocabAnswer}
      />
    );
  };

  // ─── Comprehension question ───────────────────────────────────────────────
  const renderComp = (entry: Extract<QEntry, { type: "comp" }>) => {
    const question = exercises.comprehension[entry.idx];
    return (
      <ComprehensionQuestionCard
        question={question}
        selectedIndex={compAnswers[question.id]}
        labelOptions={LABELS}
        sectionBadge={renderSectionBadge(entry)}
        optionClassName={optionCls}
        badgeClassName={badgeCls}
        onAnswer={handleCompAnswer}
      />
    );
  };

  // ─── Translation question ─────────────────────────────────────────────────
  const renderTranslation = (entry: Extract<QEntry, { type: "en2cn" | "cn2en" }>) => {
    const question = entry.type === "en2cn" ? exercises.en2cn[entry.idx] : exercises.cn2en[entry.idx];
    return (
      <TranslationQuestionCard
        question={question}
        direction={entry.type}
        userText={translTexts[question.id] ?? ""}
        revealed={translRevealed.has(question.id)}
        evalResult={translEvals[question.id]}
        evalLoading={translEvalLoading.has(question.id)}
        sectionBadge={renderSectionBadge(entry)}
        referenceCard={renderReferenceCard}
        scoreCard={renderAiScoreCard}
        suggestionCard={renderSuggestionCard}
        onChange={(value) => setTranslTexts((prev) => ({ ...prev, [question.id]: value }))}
      />
    );
  };

  // ─── Summary ──────────────────────────────────────────────────────────────
  const renderSummary = () => {
    return (
      <SummaryQuestionCard
        summaryText={summaryText}
        summaryRevealed={summaryRevealed}
        summaryEval={summaryEval}
        summaryEvalLoading={summaryEvalLoading}
        modelSummary={exercises.modelSummary}
        sectionBadge={renderSectionBadge({ type: "summary" })}
        referenceCard={renderReferenceCard}
        scoreCard={renderAiScoreCard}
        suggestionCard={renderSuggestionCard}
        onChange={setSummaryText}
      />
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
      <PracticeTopBar
        title={title}
        currentIndex={currentIdx}
        totalQuestions={questions.length}
        progress={progress}
        onBack={() => navigate(-1)}
        onOpenSheet={() => setShowSheet(true)}
      />
      <PracticeAnswerSheet
        open={showSheet}
        currentIndex={currentIdx}
        sections={sheetSections}
        sectionMeta={SECTION_META}
        getStatus={getStatus}
        onJump={jumpTo}
        onClose={() => setShowSheet(false)}
      />

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

      <PracticeBottomNav
        canGoPrev={currentIdx > 0}
        sectionAccentClass={SECTION_META[currentEntry.type].accent}
        sectionShortLabel={SECTION_META[currentEntry.type].short}
        showDoneOnly={!currentIsSubjective && isLastQ}
        primaryLabel={currentPrimaryLabel}
        primaryDisabled={currentIsSubjective ? currentSubjectiveBusy : !canGoNext}
        onPrev={goPrev}
        onDone={() => navigate(-1)}
        onPrimary={() => {
          void handlePrimaryAction();
        }}
      />
    </div>
  );
}















