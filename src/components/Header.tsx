import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isSubPage = location.pathname.startsWith("/category/");

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 pt-safe shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center relative">
        {isSubPage && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-2 p-3 text-gray-500 hover:text-gray-900 transition-all rounded-full hover:bg-gray-100 group z-10"
            aria-label="Back"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <div className="flex-1 flex justify-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
              <span className="text-white font-serif font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-serif font-bold tracking-[0.15em] text-gray-900 group-hover:text-brand transition-colors duration-300">
              Seventh Tone
            </span>
          </Link>
        </div>

        <div className="absolute right-4 hidden md:flex items-center space-x-6 text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
          <Link to="/" className="hover:text-gray-900 transition-colors">
            Latest
          </Link>
          <Link to="/bookmarks" className="hover:text-gray-900 transition-colors">
            Library
          </Link>
        </div>
      </div>
    </header>
  );
}
