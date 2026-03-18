import NewsCard from "../news/NewsCard";
import type { HomeFeedArticle } from "../../types";

interface HomeSectionProps {
  title: string;
  items: HomeFeedArticle[];
}

export default function HomeSection({ title, items }: HomeSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="pb-1">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.28em] text-gray-800 dark:text-gray-200">{title || "SECTION"}</h2>
        <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand dark:bg-emerald-400" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <NewsCard key={item.contId} news={item} />
        ))}
      </div>
    </section>
  );
}
