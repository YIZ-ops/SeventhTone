import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight, Clock3, Info, Settings, Star } from "lucide-react";
import { getReadingStats } from "../api/localData";
import { getPointsSummary } from "../api/points";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildCalendar(year: number, month: number, readingDays: string[]) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daySet = new Set(readingDays);
  const cells: Array<{ label: string; active: boolean; today: boolean } | null> = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      label: String(day),
      active: daySet.has(key),
      today: today.getFullYear() === year && today.getMonth() === month && today.getDate() === day,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MySubpage({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 pt-4 pb-24">
      {children}
    </motion.div>
  );
}

function MyOverviewContent() {
  const stats = getReadingStats();
  const pointsSummary = getPointsSummary();
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const calendarCells = useMemo(
    () => buildCalendar(calendarDate.getFullYear(), calendarDate.getMonth(), stats.readingDays),
    [calendarDate, stats.readingDays],
  );
  const totalReadingDays = stats.readingDays.length;

  const shiftCalendarMonth = (delta: number) => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pb-16">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-px w-6 bg-brand dark:bg-emerald-400" />
          <span className="text-[10px] font-extrabold tracking-[0.3em] text-brand dark:text-emerald-400 uppercase">PROFILE</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight">My</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold mb-3">Today</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.todayNewsCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">news read</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold mb-3">Total</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalNewsCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">news read</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold mb-3">Today</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatDuration(stats.todayDurationMs)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">reading time</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold mb-3">All Time</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatDuration(stats.totalDurationMs)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">reading time</p>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => shiftCalendarMonth(-1)}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors"
              aria-label="Previous month"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide min-w-[140px] text-center">
              {formatMonthYear(calendarDate)}
            </span>
            <button
              type="button"
              onClick={() => shiftCalendarMonth(1)}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-400 dark:text-gray-500 mb-3">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => (
              <div
                key={cell ? `${cell.label}-${index}` : `empty-${index}`}
                className={`aspect-square rounded-2xl flex items-center justify-center text-sm border transition-colors ${
                  !cell
                    ? "border-transparent"
                    : cell.active
                      ? "bg-gray-900 dark:bg-emerald-600 text-white border-gray-900 dark:border-emerald-500"
                      : cell.today
                        ? "border-brand dark:border-emerald-400 text-brand dark:text-emerald-300 bg-brand/5 dark:bg-emerald-500/10"
                        : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-gray-500 dark:text-gray-400"
                }`}
              >
                {cell?.label || ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-1">Reading Streak</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-1">Total Days</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {totalReadingDays} day{totalReadingDays === 1 ? "" : "s"}
              </h2>
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          {[
            {
              to: "/me/points",
              icon: Star,
              title: "Points",
              description: "Track rewards from practice and view your points history.",
              iconClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
            },
            {
              to: "/me/history",
              icon: Clock3,
              title: "History",
              description: "Review your reading timeline and revisit recent news.",
              iconClass: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
            },
            {
              to: "/me/settings",
              icon: Settings,
              title: "Settings",
              description: "Manage dark mode, news font size, and local backup tools.",
              iconClass: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
            },
            {
              to: "/me/about",
              icon: Info,
              title: "About",
              description: "Learn what Seventh Tone is built to help you do.",
              iconClass: "bg-brand/10 text-brand dark:bg-emerald-500/15 dark:text-emerald-300",
            },
          ].map(({ to, icon: Icon, title, description, iconClass }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-5 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                  {to === "/me/points" && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {pointsSummary.totalPoints} pts
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
              </div>
              <ChevronRight
                size={18}
                className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-brand dark:group-hover:text-emerald-300 transition-colors"
              />
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function My() {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const isOverview = location.pathname === "/me";

  useEffect(() => {
    if (isOverview) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [isOverview]);

  useAndroidBackHandler(() => {
    if (isOverview) {
      navigate("/");
      return;
    }
    navigate("/me");
  });

  if (outlet) {
    return <MySubpage>{outlet}</MySubpage>;
  }

  return <MyOverviewContent />;
}






