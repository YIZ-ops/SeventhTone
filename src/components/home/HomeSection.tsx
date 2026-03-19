import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import NewsCard from "../news/NewsCard";
import type { HomeFeedArticle } from "../../types";

interface HomeSectionProps {
  title: string;
  items: HomeFeedArticle[];
  categoryHref?: string;
}

export default function HomeSection({ title, items, categoryHref }: HomeSectionProps) {
  if (items.length === 0) return null;

  const headerContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.28em] text-gray-800 dark:text-gray-200">{title || "SECTION"}</h2>
        {categoryHref ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-brand dark:text-gray-500 dark:group-hover:text-emerald-400" />
        ) : null}
      </div>
      <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand dark:bg-emerald-400" />
    </>
  );

  return (
    <section className="space-y-4">
      {categoryHref ? (
        <Link
          to={categoryHref}
          className="group block pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400/40 dark:focus-visible:ring-offset-slate-950"
          aria-label={`Open ${title || "section"} category`}
        >
          {headerContent}
        </Link>
      ) : (
        <div className="pb-1">{headerContent}</div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <NewsCard key={item.contId} news={item} />
        ))}
      </div>
    </section>
  );
}
