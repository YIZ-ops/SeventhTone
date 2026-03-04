import { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Save to Bookmarks</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isCreating ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Category</label>
              <input
                type="text"
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Research, Tech, Culture"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                      ? 'border-brand bg-brand/5 text-gray-900 shadow-sm' 
                      : 'border-gray-100 hover:border-brand/30 hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-wider">{cat}</span>
                  {selectedCategory === cat && (
                    <div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_10px_rgba(6,95,70,0.5)]"></div>
                  )}
                </button>
              ))}
              
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center px-5 py-4 rounded-2xl border border-dashed border-gray-200 text-gray-400 hover:border-brand hover:text-brand transition-all duration-300 group"
              >
                <Plus size={18} className="mr-3 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-bold uppercase tracking-wider">New collection</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          {isCreating && (
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isCreating && !newCategory.trim()}
            className="px-8 py-2.5 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-50 shadow-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
