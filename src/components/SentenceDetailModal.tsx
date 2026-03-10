import { useState, useRef, useEffect } from "react";
import { X, Pencil, Trash2, Check, Tag, Image as ImageIcon } from "lucide-react";
import { Sentence } from "../types";
import { getSentenceCategories } from "../api/api";
import QuoteModal from "./QuoteModal";

interface Props {
  sentence: Sentence;
  onClose: () => void;
  onDelete: () => void;
  onSave: (updates: { thought?: string; category?: string }) => void;
}

export default function SentenceDetailModal({ sentence, onClose, onDelete, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [thought, setThought] = useState(sentence.thought ?? "");
  const [category, setCategory] = useState(sentence.category ?? "Sentences");
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const justOpenedRef = useRef(false);
  useEffect(() => {
    justOpenedRef.current = true;
    const t = setTimeout(() => {
      justOpenedRef.current = false;
    }, 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setCategories(getSentenceCategories());
  }, []);

  const handleSave = () => {
    const finalCat = isNewCategory && newCategoryName.trim() ? newCategoryName.trim() : category;
    onSave({ thought: thought.trim() || undefined, category: finalCat });
    setIsEditing(false);
    setShowCategoryPicker(false);
    setIsNewCategory(false);
  };

  const handleCancel = () => {
    setThought(sentence.thought ?? "");
    setCategory(sentence.category ?? "Sentences");
    setIsEditing(false);
    setShowCategoryPicker(false);
    setIsNewCategory(false);
  };

  return (
    <div
      data-popup
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => {
        if (!justOpenedRef.current) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-600">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Sentence</h3>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-brand dark:hover:text-emerald-400 rounded-full hover:bg-brand/5 dark:hover:bg-emerald-500/10 transition-colors"
                aria-label="Edit"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={() => {
                if (!justOpenedRef.current) setShowDeleteConfirm(true);
              }}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Quote */}
          <div className="relative pl-4 border-l-2 border-brand/40 dark:border-emerald-500/40">
            <p className="text-sm text-gray-700 dark:text-gray-200 font-serif italic leading-relaxed line-clamp-4">{sentence.text}</p>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowQuoteModal(true)}
              className="group w-full rounded-2xl border border-emerald-100/80 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/90 via-white to-white dark:from-emerald-500/10 dark:via-slate-800 dark:to-slate-800 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-brand/30 dark:hover:border-emerald-400/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-700 text-brand dark:text-emerald-400 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-500/20">
                  <ImageIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">生成书摘图片</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">把这段高亮内容快速生成成精致卡片，方便保存或分享。</p>
                </div>
              </div>
            </button>
          )}

          {/* Thought */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Your thought</label>
                <textarea
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="Add a note or idea..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-emerald-500/30 focus:border-brand dark:focus:border-emerald-500 resize-none"
                  rows={3}
                  autoFocus
                />
              </div>

              {/* Category picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                {isNewCategory ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-emerald-500/30 focus:border-brand dark:focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCategory(false);
                        setNewCategoryName("");
                      }}
                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-500"
                    >
                      Cancel new
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          category === cat
                            ? "bg-gray-900 dark:bg-emerald-600 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsNewCategory(true)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-gray-300 dark:border-slate-500 text-gray-400 dark:text-gray-500 hover:border-brand dark:hover:border-emerald-500 hover:text-brand dark:hover:text-emerald-400 transition-all"
                    >
                      + New
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Thought display */}
              {sentence.thought ? (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Your thought</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{sentence.thought}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-brand dark:hover:border-emerald-500 hover:text-brand dark:hover:text-emerald-400 transition-colors text-sm"
                >
                  <Pencil size={14} />
                  Add a thought...
                </button>
              )}

              {/* Category display */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Tag size={12} />
                <span>{sentence.category ?? "Sentences"}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {isEditing ? (
          <div className="px-4 pb-safe-or-4 pt-3 border-t border-gray-100 dark:border-slate-600 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 text-sm font-semibold text-white bg-gray-900 dark:bg-emerald-600 rounded-full hover:bg-brand dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Save
            </button>
          </div>
        ) : (
          <div className="px-4 pb-safe-or-4 pt-3 border-t border-gray-100 dark:border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation inline */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-10 bg-black/20 dark:bg-black/50" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center border border-gray-100 dark:border-slate-600">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500 dark:text-red-400" />
            </div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5">Remove sentence?</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This will delete the sentence and any note you added.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 dark:hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuoteModal && (
        <QuoteModal
          text={sentence.text}
          newsTitle={sentence.newsName || "Unknown news"}
          author="Seventh Tone"
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    </div>
  );
}
