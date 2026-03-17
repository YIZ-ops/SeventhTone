import { Pencil, Trash2 } from "lucide-react";
import type { SentenceCategoryCardData } from "./types";

interface SentenceCategoryGridProps {
  categories: SentenceCategoryCardData[];
  onOpen: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function SentenceCategoryGrid({ categories, onOpen, onRename, onDelete }: SentenceCategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <div
          key={category.name}
          className="relative rounded-2xl overflow-hidden min-h-[140px] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 cursor-pointer group hover:shadow-md hover:border-brand/20 dark:hover:border-emerald-500/30 transition-all p-4 flex flex-col"
          onClick={() => onOpen(category.name)}
        >
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(category.name);
              }}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-brand/10 hover:text-brand dark:hover:text-emerald-400 transition-all"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.name);
              }}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <Trash2 size={11} />
            </button>
          </div>
          {category.preview && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-serif italic line-clamp-3 flex-1 mb-2 leading-relaxed pr-14">
              &ldquo;{category.preview}&rdquo;
            </p>
          )}
          <div className="mt-auto">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{category.name}</p>
            <p className="text-xs text-brand/60 dark:text-emerald-400/70 mt-0.5">
              {category.count} {category.count === 1 ? "sentence" : "sentences"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
