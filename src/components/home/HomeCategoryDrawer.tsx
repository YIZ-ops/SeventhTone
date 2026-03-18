import { X } from "lucide-react";
import type { Category } from "../../types";
import HomeCategoryList from "./HomeCategoryList";

interface HomeCategoryDrawerProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
}

export default function HomeCategoryDrawer({ open, categories, onClose }: HomeCategoryDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="Close categories" onClick={onClose} />

      <aside className="absolute left-0 top-0 h-full w-[min(19rem,80vw)] overflow-y-auto bg-white px-5 pb-8 pt-safe shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200/70 pb-4 pt-4 dark:border-slate-700/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500">Browse</p>
            <h2 className="mt-1 text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">Categories</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="Close categories"
          >
            <X size={18} />
          </button>
        </div>

        <HomeCategoryList categories={categories} onSelect={onClose} />
      </aside>
    </div>
  );
}
