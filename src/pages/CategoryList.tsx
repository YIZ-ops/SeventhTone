import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../api/categories";
import type { Category } from "../types";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastBackAtRef = useRef(0);
  const toastElRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showExitToast = useCallback(() => {
    if (toastElRef.current) return;

    const toastEl = document.createElement("div");
    toastEl.textContent = "再按一次退出程序";
    Object.assign(toastEl.style, {
      position: "fixed",
      bottom: "96px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.75)",
      color: "white",
      padding: "10px 22px",
      borderRadius: "24px",
      fontSize: "14px",
      zIndex: "9999",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(toastEl);
    toastElRef.current = toastEl;

    toastTimerRef.current = setTimeout(() => {
      if (toastElRef.current && document.body.contains(toastElRef.current)) {
        document.body.removeChild(toastElRef.current);
      }
      toastElRef.current = null;
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastElRef.current && document.body.contains(toastElRef.current)) {
        document.body.removeChild(toastElRef.current);
      }
    };
  }, []);

  useAndroidBackHandler(() => {
    const now = Date.now();
    if (now - lastBackAtRef.current < 2000) {
      CapacitorApp.exitApp();
      return;
    }

    lastBackAtRef.current = now;
    showExitToast();
  });

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sections"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            getCategories()
              .then(setCategories)
              .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sections"))
              .finally(() => setLoading(false));
          }}
          className="px-6 py-2 bg-brand text-white rounded-full font-medium hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <header className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <span className="h-px w-8 bg-brand dark:bg-emerald-400"></span>
          <span className="text-xs font-extrabold tracking-[0.2em] text-brand dark:text-emerald-400 uppercase">Explore</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight">Sections</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category, index) => (
          <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Link
              to={`/category/${category.id}`}
              className={`group block relative h-full min-h-[200px] p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] dark:shadow-none hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-none transition-all duration-500 active:scale-[0.98] overflow-hidden ${!category.tonePic ? "bg-white dark:bg-slate-800" : ""}`}
            >
              {/* 有 tonePic 时：背景图 + 渐变遮罩，白色文字 */}
              {category.tonePic && (
                <>
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${category.tonePic})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" />
                </>
              )}
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <ArrowRight className={category.tonePic ? "text-white drop-shadow-md" : "text-brand"} size={24} />
              </div>

              <div className="relative z-10">
                <span
                  className={`inline-block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 transition-colors ${category.tonePic ? "text-white/80 group-hover:text-white" : "text-gray-400 group-hover:text-brand"}`}
                >
                  {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
                <h2
                  className={`text-2xl font-bold mb-4 tracking-tight group-hover:translate-x-1 transition-transform duration-300 ${category.tonePic ? "text-white drop-shadow-sm" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {category.title}
                </h2>
                <p
                  className={`leading-relaxed max-w-[36ch] line-clamp-3 ${category.tonePic ? "text-white/85 drop-shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {category.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
