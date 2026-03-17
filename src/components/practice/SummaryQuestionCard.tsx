import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { SummaryEvaluation } from "../../api/llm";

interface SummaryQuestionCardProps {
  summaryText: string;
  summaryRevealed: boolean;
  summaryEval: SummaryEvaluation | null;
  summaryEvalLoading: boolean;
  modelSummary: string;
  sectionBadge: ReactNode;
  referenceCard: (answer: string) => ReactNode;
  scoreCard: (score: number, reasons: Array<{ label?: string; text: string }>) => ReactNode;
  suggestionCard: (content: string) => ReactNode;
  onChange: (value: string) => void;
}

export default function SummaryQuestionCard({
  summaryText,
  summaryRevealed,
  summaryEval,
  summaryEvalLoading,
  modelSummary,
  sectionBadge,
  referenceCard,
  scoreCard,
  suggestionCard,
  onChange,
}: SummaryQuestionCardProps) {
  const wordCount = summaryText.trim() ? summaryText.trim().split(/\s+/).length : 0;
  const locked = summaryRevealed || summaryEvalLoading;
  const hasText = summaryText.trim().length > 0;

  return (
    <div className="space-y-4">
      {sectionBadge}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Write an English summary of this news (3–5 sentences).</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Cover the main points, key facts, and any significant implication.</p>
      </div>

      <div>
        <textarea
          value={summaryText}
          onChange={(e) => onChange(e.target.value)}
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
          {referenceCard(modelSummary)}
          {summaryEvalLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-1">
              <Loader2 size={14} className="animate-spin" />
              <span>AI checking…</span>
            </div>
          )}
          {hasText &&
            summaryEval &&
            !summaryEvalLoading &&
            scoreCard(summaryEval.score, [
              { label: "语法", text: summaryEval.grammar },
              { label: "内容", text: summaryEval.content },
              { label: "词汇", text: summaryEval.vocabulary },
            ])}
          {hasText && summaryEval && !summaryEvalLoading && suggestionCard(summaryEval.improved || modelSummary)}
        </motion.div>
      )}
    </div>
  );
}

