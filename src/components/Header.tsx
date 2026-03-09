import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSubPage = location.pathname.startsWith("/category/");
  const isHome = location.pathname === "/";
  const mySubpageConfig: Record<string, { title: string; backTarget: string }> = {
    "/me/history": { title: "History", backTarget: "/me" },
    "/me/settings": { title: "Settings", backTarget: "/me" },
    "/me/about": { title: "About", backTarget: "/me" },
  };
  const mySubpage = mySubpageConfig[location.pathname];
  const showBackButton = isSubPage || Boolean(mySubpage);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 pt-safe shadow-sm">
      <div className="max-w-4xl mx-auto px-2 h-11 flex items-center gap-1">
        <div className="w-16 flex items-center shrink-0">
          {showBackButton && (
            <button
              onClick={() => (mySubpage ? navigate(mySubpage.backTarget) : navigate(-1))}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-emerald-400 transition-colors group"
              aria-label="Back"
            >
              <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        <div className={`flex-1 min-w-0 ${mySubpage ? "flex items-center justify-start" : "flex justify-center"}`}>
          {mySubpage ? (
            <div className="-ml-8 text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{mySubpage.title}</div>
          ) : (
            <Link to="/" className="flex items-center space-x-2 group shrink-0">
              <div className="w-6 h-6 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-brand dark:group-hover:bg-emerald-500 transition-colors duration-300">
                <span className="text-white dark:text-slate-900 font-serif font-bold text-lg">S</span>
              </div>
              <span className="text-lg font-serif font-bold tracking-[0.15em] text-gray-900 dark:text-gray-100 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors duration-300">
                Seventh Tone
              </span>
            </Link>
          )}
        </div>

        <div className="w-16 flex items-center justify-end gap-0.5 shrink-0">
          {isHome && (
            <Link
              to="/search"
              className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
