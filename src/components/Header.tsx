import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isSubPage = location.pathname.startsWith("/category/");

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 pt-safe shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-10 flex items-center relative">
        {isSubPage && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-2 p-3 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors group z-10"
            aria-label="Back"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <div className="flex-1 flex justify-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-6 h-6 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-brand dark:group-hover:bg-emerald-500 transition-colors duration-300">
              <span className="text-white dark:text-slate-900 font-serif font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-serif font-bold tracking-[0.15em] text-gray-900 dark:text-gray-100 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors duration-300">
              Seventh Tone
            </span>
          </Link>
        </div>

        <div className="absolute right-4 flex items-center space-x-2 md:space-x-4 text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label={theme === "dark" ? "切换到日间模式" : "切换到夜间模式"}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link
            to="/search"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Search"
          >
            <Search size={20} />
          </Link>
          <Link to="/" className="hidden md:inline hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            Latest
          </Link>
          <Link to="/bookmarks" className="hidden md:inline hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            Library
          </Link>
        </div>
      </div>
    </header>
  );
}
