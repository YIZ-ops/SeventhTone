import { Link } from "react-router-dom";
import type { HomeFeedArticle } from "../../types";

interface HomeHeroProps {
  item: HomeFeedArticle;
}

export default function HomeHero({ item }: HomeHeroProps) {
  const imageSrc = item.pic || item.appHeadPic;

  return (
    <Link to={`/news/${item.contId}`} className="group relative block min-h-[24rem] overflow-hidden bg-zinc-900 md:min-h-[30rem]">
      <div className="absolute inset-0">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
      </div>

      <div className="relative z-10 flex min-h-[24rem] flex-col justify-end px-4 pb-8 pt-20 md:min-h-[26rem] md:px-6 md:pb-10">
        <h2 className="max-w-3xl text-[1.7rem] font-serif font-bold leading-[1.06] text-white md:text-[3.15rem]">{item.name}</h2>
      </div>
    </Link>
  );
}
