import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getHistory, clearHistory } from "../api/api";
import { ArticleItem } from "../types";
import { Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";

export default function History() {
  const [history, setHistory] = useState<ArticleItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear your reading history?")) {
      clearHistory();
      setHistory([]);
    }
  };

  const timeAgo = (article: ArticleItem) => {
    try {
      if (article.pubTimeLong) return formatDistanceToNow(new Date(article.pubTimeLong), { addSuffix: true });
      return article.pubTime;
    } catch {
      return article.pubTime;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="h-px w-6 bg-brand"></span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-brand uppercase">Activity</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight">History</h1>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 transition-all"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
            <Clock size={32} className="text-gray-200" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Your shelf is empty</h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Articles you read will be automatically collected here for quick access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((article, index) => (
            <motion.div
              key={`${article.contId}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/article/${article.contId}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all group"
              >
                <img
                  src={article.pic || article.appHeadPic}
                  alt={article.name}
                  className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-brand transition-colors">
                    {article.name}
                  </h3>
                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-gray-400">
                    <Clock size={10} className="shrink-0" />
                    <span>{timeAgo(article)}</span>
                    {article.userInfo && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span>{article.userInfo.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
