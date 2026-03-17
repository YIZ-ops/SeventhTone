import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { TranslationEval, TranslationQuestion } from "../../api/llm";

interface TranslationQuestionCardProps {
  question: TranslationQuestion;
  direction: "en2cn" | "cn2en";
  userText: string;
  revealed: boolean;
  evalResult?: TranslationEval;
  evalLoading: boolean;
  sectionBadge: ReactNode;
  referenceCard: (answer: string) => ReactNode;
  scoreCard: (score: number, reasons: Array<{ label?: string; text: string }>) => ReactNode;
  suggestionCard: (content: string) => ReactNode;
  onChange: (value: string) => void;
}

export default function TranslationQuestionCard({
  question,
  direction,
  userText,
  revealed,
  evalResult,
  evalLoading,
  sectionBadge,
  referenceCard,
  scoreCard,
  suggestionCard,
  onChange,
}: TranslationQuestionCardProps) {
  const isEnToCn = direction === "en2cn";
  const hasText = userText.trim().length > 0;

  return (
    <div className="space-y-4">
      {sectionBadge}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <p className={`text-base leading-relaxed ${isEnToCn ? "italic text-gray-800 dark:text-gray-100" : "text-gray-800 dark:text-gray-100"}`}>
          {question.sourceText}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Your translation</p>
        <textarea
          value={userText}
          onChange={(e) => onChange(e.target.value)}
          disabled={revealed}
          placeholder={isEnToCn ? "在此输入中文翻译…" : "Write your English translation here…"}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-gray-50 disabled:dark:bg-slate-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-emerald-500 resize-none transition-colors"
        />
      </div>

      {revealed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {referenceCard(question.modelAnswer)}
          {evalLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-1">
              <Loader2 size={14} className="animate-spin" />
              <span>AI checking…</span>
            </div>
          )}
          {hasText && evalResult && !evalLoading && scoreCard(evalResult.score, [{ text: evalResult.feedback }])}
          {hasText && evalResult && !evalLoading && suggestionCard(evalResult.improved)}
        </motion.div>
      )}
    </div>
  );
}

