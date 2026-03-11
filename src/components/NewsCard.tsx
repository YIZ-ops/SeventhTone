import { Link } from "react-router-dom";
import { NewsItem } from "../types";
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
      className="group block bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-600 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 active:scale-[0.99]"
    >
      <div className="flex flex-col">
        <div className="w-full aspect-[16/9] relative overflow-hidden bg-gray-50 dark:bg-slate-700">
          <img
            src={news.pic || news.appHeadPic}
            alt={news.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {news.nodeInfo?.name && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-brand uppercase tracking-[0.1em] rounded-full shadow-sm">
                {news.nodeInfo.name}
              </span>
            </div>
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">{timeDisplay}</span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-3 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors duration-300">
            {news.name}
          </h3>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed italic">{news.summary}</p>

          <div className="flex items-center pt-4 border-t border-gray-50 dark:border-slate-600">
            {news.userInfo ? (
              <div className="flex items-center space-x-2">
                {news.userInfo.pic && (
                  <img
                    src={news.userInfo.pic}
                    alt={news.userInfo.name}
                    className="w-6 h-6 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider group-hover:text-gray-600 dark:group-hover:text-gray-500 transition-colors">
                  {news.userInfo.name}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Seventh Tone</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
