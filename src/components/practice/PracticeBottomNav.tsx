import { ChevronLeft, ChevronRight } from "lucide-react";

interface PracticeBottomNavProps {
  canGoPrev: boolean;
  sectionAccentClass: string;
  sectionShortLabel: string;
  showDoneOnly: boolean;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrev: () => void;
  onDone: () => void;
  onPrimary: () => void;
}

export default function PracticeBottomNav({
  canGoPrev,
  sectionAccentClass,
  sectionShortLabel,
  showDoneOnly,
  primaryLabel,
  primaryDisabled,
  onPrev,
  onDone,
  onPrimary,
}: PracticeBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-700/60 pb-safe shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.5)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="flex-1 flex justify-center">
          <span className={`text-xs font-bold uppercase tracking-wider ${sectionAccentClass}`}>{sectionShortLabel}</span>
        </div>

        {showDoneOnly ? (
          <button
            onClick={onDone}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-brand dark:bg-emerald-600 text-white hover:bg-brand/90 transition-colors shadow-sm shadow-emerald-500/20"
          >
            Done <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-bold bg-brand dark:bg-emerald-600 text-white disabled:opacity-30 hover:bg-brand/90 transition-colors shadow-sm shadow-emerald-500/20"
          >
            {primaryLabel} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
