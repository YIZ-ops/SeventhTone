import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { getBookmarkCategories } from '../api/api';

interface Props {
  onClose: () => void;
  onSave: (category: string) => void;
}

export default function BookmarkModal({ onClose, onSave }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Read Later');
  const [newCategory, setNewCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const justOpenedRef = useRef(false);
  useEffect(() => {
    justOpenedRef.current = true;
    const t = setTimeout(() => { justOpenedRef.current = false; }, 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const existing = getBookmarkCategories();
    if (!existing.includes('Read Later')) {
      existing.unshift('Read Later');
    }
    setCategories(existing);
  }, []);

  const handleSave = () => {
    if (isCreating && newCategory.trim()) {
      onSave(newCategory.trim());
    } else {
      onSave(selectedCategory);
    }
  };

  return (
    <div data-popup className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={() => { if (!justOpenedRef.current) onClose(); }}>
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-600">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Save to Bookmarks</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isCreating ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Category</label>
              <input
                type="text"
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Research, Tech, Culture"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
                    selectedCategory === cat 
                      ? 'border-brand dark:border-emerald-500 bg-brand/5 dark:bg-emerald-500/20 text-gray-900 dark:text-gray-100 shadow-sm' 
                      : 'border-gray-100 dark:border-slate-600 hover:border-brand/30 dark:hover:border-emerald-500/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-wider">{cat}</span>
                  {selectedCategory === cat && (
                    <div className="w-2 h-2 rounded-full bg-brand dark:bg-emerald-400 shadow-[0_0_10px_rgba(6,95,70,0.5)]"></div>
                  )}
                </button>
              ))}
              
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center px-5 py-4 rounded-2xl border border-dashed border-gray-200 dark:border-slate-500 text-gray-400 dark:text-gray-500 hover:border-brand dark:hover:border-emerald-500 hover:text-brand dark:hover:text-emerald-400 transition-all duration-300 group"
              >
                <Plus size={18} className="mr-3 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-bold uppercase tracking-wider">New collection</span>
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pt-4 pb-safe-or-4 border-t border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 flex justify-end space-x-3">
          {isCreating && (
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isCreating && !newCategory.trim()}
            className="px-8 py-2.5 bg-gray-900 dark:bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
