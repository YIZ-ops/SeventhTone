import { Check, X } from "lucide-react";
import { motion } from "motion/react";

interface RenameCategoryDialogProps {
  category: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RenameCategoryDialog({ category, value, onChange, onCancel, onConfirm }: RenameCategoryDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Rename Category</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Current: {category}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-emerald-500 focus:border-transparent mb-4"
          placeholder="Enter new category name"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={14} /> Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!value.trim() || value.trim() === category}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-brand/90 dark:hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={14} /> Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
