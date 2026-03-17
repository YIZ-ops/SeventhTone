import { ChevronLeft, LayoutGrid } from "lucide-react";

interface PracticeTopBarProps {
  title: string;
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  onBack: () => void;
  onOpenSheet: () => void;
}

export default function PracticeTopBar({ title, currentIndex, totalQuestions, progress, onBack, onOpenSheet }: PracticeTopBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/60 pt-safe shadow-[0_6px_20px_-18px_rgba(0,0,0,0.5)]">
      <div className="max-w-2xl mx-auto px-3 h-14 flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 -ml-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors shrink-0"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0 px-1">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{title}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
              {currentIndex + 1}/{totalQuestions}
            </p>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-400" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          onClick={onOpenSheet}
          className="p-2 -mr-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors shrink-0"
          aria-label="Answer sheet"
        >
          <LayoutGrid size={20} />
        </button>
      </div>
    </div>
  );
}
