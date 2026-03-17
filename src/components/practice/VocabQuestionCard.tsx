import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { VocabQuestion } from "../../api/llm";

interface VocabQuestionCardProps {
  question: VocabQuestion;
  selected?: string;
  labelOptions: string[];
  sectionBadge: ReactNode;
  optionClassName: (answered: boolean, isSelected: boolean, isCorrect: boolean) => string;
  badgeClassName: (answered: boolean, isSelected: boolean, isCorrect: boolean) => string;
  onAnswer: (questionId: string, option: string) => void;
}

export default function VocabQuestionCard({
  question,
  selected,
  labelOptions,
  sectionBadge,
  optionClassName,
  badgeClassName,
  onAnswer,
}: VocabQuestionCardProps) {
  const answered = Boolean(selected);
  const correct = selected === question.answer;

  return (
    <div className="space-y-4">
      {sectionBadge}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
          {question.sentence.split("___").map((part, index, array) => (
            <span key={index}>
              {part}
              {index < array.length - 1 && (
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

      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selected === option;
          const isCorrect = option === question.answer;
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(question.id, option)}
              className={optionClassName(answered, isSelected, isCorrect)}
            >
              <span className={badgeClassName(answered, isSelected, isCorrect)}>{labelOptions[index]}</span>
              <span
                className={`text-sm font-medium ${
                  answered && isCorrect
                    ? "text-emerald-700 dark:text-emerald-400"
                    : answered && isSelected
                      ? "text-red-600 dark:text-red-400"
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
              {correct ? "✓ Correct!" : `✗ The answer is "${question.answer}"`}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

