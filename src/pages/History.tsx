import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { getHistoryEntriesToday, clearHistory } from "../api/history";
import type { HistoryEntry } from "../api/history";
import { Trash2, Clock } from "lucide-react";
import { motion } from "motion/react";

export default function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setEntries(getHistoryEntriesToday());
  }, []);

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto pb-32">
      {entries.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <Clock size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No reading today</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">news you read today will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={`${entry.news.contId}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/news/${entry.news.contId}`}
                className="relative overflow-hidden flex items-center gap-3 p-3 bg-white dark:bg-slate-800 group hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors rounded-2xl border border-gray-100 dark:border-slate-600"
              >
                <img
                  src={entry.news.pic || entry.news.appHeadPic}
                  alt={entry.news.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-slate-700"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colorss">
                    {entry.news.name}
                  </h3>
                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                    <Clock size={10} className="shrink-0" />
                    <span>{formatTime(entry.readAt)}</span>
                    {entry.news.userInfo && (
                      <>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">·</span>
                        <span>{entry.news.userInfo.name}</span>
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
