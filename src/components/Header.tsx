import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Menu, Search } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSubPage = location.pathname.startsWith("/category/");
  const isHome = location.pathname === "/home";
  const pageTitleConfig: Record<string, { title: string }> = {
    "/bookmarks": { title: "Bookmarks" },
    "/me": { title: "My" },
  };
  const mySubpageConfig: Record<string, { title: string; backTarget: string }> = {
    "/me/points": { title: "Points", backTarget: "/me" },
    "/me/history": { title: "History", backTarget: "/me" },
    "/me/settings": { title: "Settings", backTarget: "/me" },
    "/me/about": { title: "About", backTarget: "/me" },
  };
  const pageTitle = pageTitleConfig[location.pathname];
  const mySubpage = mySubpageConfig[location.pathname];
  const showBackButton = isSubPage || Boolean(mySubpage);

  const openHomeCategories = () => {
    window.dispatchEvent(new Event("home-categories:open"));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/50 bg-white/90 pt-safe shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/90">
      <div className="mx-auto flex h-11 max-w-4xl items-center gap-1 px-2">
        <div className="flex w-16 items-center shrink-0">
          {isHome ? (
            <button
              type="button"
              onClick={openHomeCategories}
              className="group p-2 text-gray-500 transition-colors hover:text-brand dark:text-gray-400 dark:hover:text-emerald-400"
              aria-label="Open categories"
            >
              <Menu size={20} />
            </button>
          ) : showBackButton ? (
            <button
              onClick={() => (mySubpage ? navigate(mySubpage.backTarget) : navigate(-1))}
              className="group p-2 text-gray-500 transition-colors hover:text-brand dark:text-gray-400 dark:hover:text-emerald-400"
              aria-label="Back"
            >
              <ChevronLeft size={24} className="transition-transform group-hover:-translate-x-1" />
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex flex-1 items-center justify-center">
          {mySubpage ? (
            <div className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{mySubpage.title}</div>
          ) : pageTitle ? (
            <div className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{pageTitle.title}</div>
          ) : (
            <Link to="/home" className="group flex shrink-0 items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-900 transition-colors duration-300 group-hover:bg-brand dark:bg-gray-100 dark:group-hover:bg-emerald-500">
                <span className="font-serif text-lg font-bold text-white dark:text-slate-900">S</span>
              </div>
              <span className="font-serif text-lg font-bold tracking-[0.15em] text-gray-900 transition-colors duration-300 group-hover:text-brand dark:text-gray-100 dark:group-hover:text-emerald-400">
                Seventh Tone
              </span>
            </Link>
          )}
        </div>

        <div className="flex w-16 shrink-0 items-center justify-end">
          {isHome ? (
            <Link
              to="/search"
              className="group p-2 text-gray-500 transition-colors hover:text-brand dark:text-gray-400 dark:hover:text-emerald-400"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
