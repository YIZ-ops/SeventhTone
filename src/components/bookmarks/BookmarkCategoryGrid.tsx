import { Pencil, Trash2 } from "lucide-react";
import type { BookmarkCategoryCardData } from "./types";

interface BookmarkCategoryGridProps {
  categories: BookmarkCategoryCardData[];
  onOpen: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function BookmarkCategoryGrid({ categories, onOpen, onRename, onDelete }: BookmarkCategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <div
          key={category.name}
          className="relative rounded-2xl overflow-hidden min-h-[140px] cursor-pointer group"
          onClick={() => onOpen(category.name)}
        >
          {category.cover ? (
            <>
              <img
                src={category.cover}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-700 dark:to-slate-800" />
          )}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(category.name);
              }}
              className="p-1.5 rounded-full bg-black/25 text-white/80 hover:bg-white/30 hover:text-white transition-all backdrop-blur-sm"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.name);
              }}
              className="p-1.5 rounded-full bg-black/25 text-white/80 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm"
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className={`text-sm font-bold leading-snug truncate ${category.cover ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
              {category.name}
            </p>
            <p className={`text-xs mt-0.5 ${category.cover ? "text-white/60" : "text-gray-400 dark:text-gray-500"}`}>
              {category.count} {category.count === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
