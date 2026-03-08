import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { getHistoryEntriesToday, clearHistory } from "../api/api";
import type { HistoryEntry } from "../api/api";
import { Trash2, Clock } from "lucide-react";
import { motion } from "motion/react";
import ConfirmModal from "../components/ConfirmModal";

export default function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setEntries(getHistoryEntriesToday());
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let handle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", () => { navigate("/"); }).then((h) => { handle = h; });
    return () => { handle?.remove?.(); };
  }, [navigate]);

  const handleClearClick = () => setShowClearConfirm(true);

  const handleConfirmClear = () => {
    clearHistory();
    setEntries([]);
    setShowClearConfirm(false);
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="h-px w-6 bg-brand dark:bg-emerald-400"></span>
            <span className="text-[10px] font-extrabold tracking-[0.3em] text-brand dark:text-emerald-400 uppercase">Activity</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight">History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Today&apos;s reading</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleClearClick}
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-all"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <Clock size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">No reading today</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Articles you read today will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={`${entry.article.contId}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/article/${entry.article.contId}`}
                className="relative overflow-hidden flex items-center gap-3 p-3 bg-white dark:bg-slate-800 group hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors rounded-2xl border border-gray-100 dark:border-slate-600"
              >
                <img
                  src={entry.article.pic || entry.article.appHeadPic}
                  alt={entry.article.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-slate-700"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colorss">
                    {entry.article.name}
                  </h3>
                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                    <Clock size={10} className="shrink-0" />
                    <span>{formatTime(entry.readAt)}</span>
                    {entry.article.userInfo && (
                      <>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">·</span>
                        <span>{entry.article.userInfo.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClear}
        title="Clear today's history?"
        message="All articles you read today will be removed from this list. This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
      />
    </motion.div>
  );
}
