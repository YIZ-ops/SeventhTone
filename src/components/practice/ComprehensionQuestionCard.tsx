import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ComprehensionQuestion } from "../../api/llm";

interface ComprehensionQuestionCardProps {
  question: ComprehensionQuestion;
  selectedIndex?: number;
  labelOptions: string[];
  sectionBadge: ReactNode;
  optionClassName: (answered: boolean, isSelected: boolean, isCorrect: boolean) => string;
  badgeClassName: (answered: boolean, isSelected: boolean, isCorrect: boolean) => string;
  onAnswer: (questionId: string, index: number) => void;
}

export default function ComprehensionQuestionCard({
  question,
  selectedIndex,
  labelOptions,
  sectionBadge,
  optionClassName,
  badgeClassName,
  onAnswer,
}: ComprehensionQuestionCardProps) {
  const answered = selectedIndex !== undefined;
  const correct = selectedIndex === question.answer;

  return (
    <div className="space-y-4">
      {sectionBadge}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{question.question}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === question.answer;
          return (
            <button
              key={`${question.id}-${index}`}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(question.id, index)}
              className={optionClassName(answered, isSelected, isCorrect)}
            >
              <span className={badgeClassName(answered, isSelected, isCorrect)}>{labelOptions[index]}</span>
              <span
                className={`text-sm ${
                  answered && isCorrect
                    ? "font-medium text-emerald-700 dark:text-emerald-400"
                    : answered && isSelected
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {option}
              </span>
              {answered && isCorrect && <CheckCircle2 className="ml-auto shrink-0 text-emerald-500" size={17} />}
              {answered && isSelected && !isCorrect && <XCircle className="ml-auto shrink-0 text-red-500" size={17} />}
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
            <p className={`text-sm font-semibold mb-1 ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
              {correct ? "✓ Correct!" : `✗ The answer is "${question.options[question.answer]}"`}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-[1.6]">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
