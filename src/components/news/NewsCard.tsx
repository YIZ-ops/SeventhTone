import { Link } from "react-router-dom";
import { NewsItem } from "../../types";
import { formatDistanceToNow } from "date-fns";

import { Key } from "react";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  key?: Key;
  news: NewsItem;
}

export default function NewsCard({ news }: Props) {
  const isOld = news.pubTimeLong && Date.now() - news.pubTimeLong > SEVEN_DAYS_MS;
  const timeDisplay = isOld
    ? new Date(news.pubTimeLong).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : news.pubTimeLong
      ? formatDistanceToNow(new Date(news.pubTimeLong), { addSuffix: true })
      : news.pubTime;

  return (
    <Link
      to={`/news/${news.contId}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-[0_24px_50px_-22px_rgba(0,0,0,0.16)] transition-all duration-500 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:shadow-[0_24px_50px_-22px_rgba(0,0,0,0.34)]"
    >
      <div className="flex flex-col gap-3 p-4 md:p-5">
        <div className="flex gap-4 md:gap-5">
          <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-slate-700 md:h-28 md:w-40">
            <img
              src={news.pic || news.appHeadPic}
              alt={news.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-start">
            <h3 className="break-words text-[0.98rem] font-bold leading-tight text-gray-900 transition-colors duration-300 group-hover:text-brand dark:text-gray-100 dark:group-hover:text-emerald-400 md:text-[1.16rem]">
              {news.name}
            </h3>
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-[1.6] text-gray-500 dark:text-gray-400 md:text-[15px]">{news.summary}</p>

        <div className="flex items-center justify-between pt-1 text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {news.userInfo ? (
            <div className="flex min-w-0 items-center space-x-2">
              {news.userInfo.pic && (
                <img
                  src={news.userInfo.pic}
                  alt={news.userInfo.name}
                  className="w-5 h-5 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="truncate text-[10px] font-bold tracking-[0.14em] text-gray-500 transition-colors group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300">
                {news.userInfo.name}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-bold tracking-[0.14em] text-gray-500 dark:text-gray-400">Seventh Tone</span>
          )}
          <span className="text-[10px] font-medium tracking-[0.2em]">{timeDisplay}</span>
        </div>
      </div>
    </Link>
  );
}
