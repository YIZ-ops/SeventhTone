import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { getHighlightCategories } from "../api/api";

interface Props {
  selectedText: string;
  onClose: () => void;
  onSave: (category: string, thought?: string) => void;
}

export default function HighlightSaveModal({ selectedText, onClose, onSave }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Highlights");
  const [thought, setThought] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Guard: prevent the same tap that opened this modal from immediately closing it
  const justOpenedRef = useRef(false);
  useEffect(() => {
    justOpenedRef.current = true;
    const t = setTimeout(() => { justOpenedRef.current = false; }, 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cats = getHighlightCategories();
    setCategories(cats);
    setSelectedCategory(cats.includes("Highlights") ? "Highlights" : cats[0] ?? "Highlights");
  }, []);

  const handleSave = () => {
    const cat = isNewCategory && newCategoryName.trim() ? newCategoryName.trim() : selectedCategory;
    onSave(cat, thought.trim() || undefined);
    onClose();
  };

  return (
    <div
      data-popup
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
      onClick={() => { if (!justOpenedRef.current) onClose(); }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-600">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Save Highlight</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Quote</label>
            <p className="text-sm text-gray-700 dark:text-gray-200 font-serif italic line-clamp-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">&ldquo;{selectedText}&rdquo;</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Your thought (optional)</label>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="Add a note or idea..."
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-emerald-500/30 focus:border-brand dark:focus:border-emerald-500 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            {isNewCategory ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-emerald-500/30 focus:border-brand dark:focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setIsNewCategory(false); setNewCategoryName(""); }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat ? "bg-gray-900 dark:bg-emerald-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsNewCategory(true)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-dashed border-gray-300 dark:border-slate-500 text-gray-400 dark:text-gray-500 hover:border-brand dark:hover:border-emerald-500 hover:text-brand dark:hover:text-emerald-400 transition-all flex items-center gap-1"
                >
                  <Plus size={12} />
                  New
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 pb-safe-or-4 border-t border-gray-100 dark:border-slate-600 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isNewCategory && !newCategoryName.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-emerald-600 rounded-full hover:bg-brand dark:hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
