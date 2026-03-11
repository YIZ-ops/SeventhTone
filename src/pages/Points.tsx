import { useMemo } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { getPointsSummary, getPointsTransactions } from "../api/points";

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

export default function PointsPage() {
  const summary = useMemo(() => getPointsSummary(), []);
  const transactions = useMemo(() => getPointsTransactions(), []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto pb-32 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white px-5 py-5 shadow-sm dark:border-amber-500/20 dark:bg-slate-800">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <Star size={14} />
          Rewards
        </div>
        <div className="rounded-xl bg-amber-50/70 px-5 py-5 dark:bg-amber-500/10">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Total points</p>
          <p className="mt-3 text-5xl font-serif font-bold text-gray-900 dark:text-gray-100">{summary.totalPoints}</p>
        </div>
      </section>

      {transactions.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
            <Star size={32} className="text-gray-200 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">No points yet</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">
            Your reward history will appear here after you complete practice.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((item, index) => {
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800"
              >
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                  {/* <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">{item.description}</p> */}
                  {item.articleTitle && <p className="text-sm leading-5 break-words text-gray-500 dark:text-gray-400">{item.articleTitle}</p>}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-400 dark:text-gray-500">
                    <p className="whitespace-nowrap">{formatDateTime(item.createdAt)}</p>
                    <p className="text-sm font-bold leading-none text-amber-600 dark:text-amber-300">+{item.points}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
