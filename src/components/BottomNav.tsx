import { NavLink } from "react-router-dom";
import { Home, Clock, Bookmark, CalendarDays } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-6 pointer-events-none">
      <nav className="max-w-md mx-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-gray-200/60 dark:border-slate-600/60 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-2 py-2 pointer-events-auto">
        <div className="flex justify-around items-center h-12">
          <NavLink
            to="/daily-tones"
            className={({ isActive }) =>
              `flex items-center justify-center w-full h-full rounded-full transition-all duration-300 ${
                isActive ? "bg-gray-900 dark:bg-emerald-600 text-white shadow-md" : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <CalendarDays size={20} />
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Daily</span>
          </NavLink>

          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center justify-center w-full h-full rounded-full transition-all duration-300 ${
                isActive ? "bg-gray-900 dark:bg-emerald-600 text-white shadow-md" : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <Home size={20} />
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Home</span>
          </NavLink>

          <NavLink
            to="/bookmarks"
            className={({ isActive }) =>
              `flex items-center justify-center w-full h-full rounded-full transition-all duration-300 ${
                isActive ? "bg-gray-900 dark:bg-emerald-600 text-white shadow-md" : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <Bookmark size={20} />
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Saved</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center justify-center w-full h-full rounded-full transition-all duration-300 ${
                isActive ? "bg-gray-900 dark:bg-emerald-600 text-white shadow-md" : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <Clock size={20} />
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">History</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
