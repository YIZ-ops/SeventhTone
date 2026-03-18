import { Link } from "react-router-dom";
import type { Category } from "../../types";

interface HomeCategoryListProps {
  categories: Category[];
  onSelect: () => void;
}

export default function HomeCategoryList({ categories, onSelect }: HomeCategoryListProps) {
  return (
    <div className="mt-5 space-y-2">
      {categories.map((category) => (
        <Link
          key={category.id}
          to={`/category/${category.id}`}
          onClick={onSelect}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
        >
          {category.pic || category.tonePic ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <img src={category.pic || category.tonePic} alt={category.title} className="h-9 w-9 shrink-0 rounded-xl object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="h-9 w-9 shrink-0 rounded-xl bg-gray-100" aria-hidden="true" />
          )}
          <span className="min-w-0 text-sm font-semibold tracking-[0.08em] text-gray-900 dark:text-gray-100">{category.title}</span>
        </Link>
      ))}
    </div>
  );
}
