import { Link } from "react-router-dom";
import { ArticleItem } from "../types";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";

import { Key } from "react";

interface Props {
  key?: Key;
  article: ArticleItem;
}

export default function ArticleCard({ article }: Props) {
  const timeAgo = article.pubTimeLong ? formatDistanceToNow(new Date(article.pubTimeLong), { addSuffix: true }) : article.pubTime;

  return (
    <Link
      to={`/article/${article.contId}`}
      className="group block bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-600 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 active:scale-[0.99]"
    >
      <div className="flex flex-col">
        <div className="w-full aspect-[16/9] relative overflow-hidden bg-gray-50 dark:bg-slate-700">
          <img
            src={article.pic || article.appHeadPic}
            alt={article.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {article.nodeInfo?.name && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-[10px] font-bold text-brand uppercase tracking-[0.1em] rounded-full shadow-sm">
                {article.nodeInfo.name}
              </span>
            </div>
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">{timeAgo}</span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight mb-3 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors duration-300">
            {article.name}
          </h3>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed font-serif italic">{article.summary}</p>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-600">
            {article.userInfo ? (
              <div className="flex items-center space-x-2">
                {article.userInfo.pic && (
                  <img
                    src={article.userInfo.pic}
                    alt={article.userInfo.name}
                    className="w-6 h-6 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {article.userInfo.name}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Seventh Tone</span>
            )}
            <div className="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-600 flex items-center justify-center group-hover:bg-brand dark:group-hover:bg-emerald-500 group-hover:border-brand dark:group-hover:border-emerald-500 transition-all duration-300">
              <ArrowRight size={14} className="text-gray-300 dark:text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
