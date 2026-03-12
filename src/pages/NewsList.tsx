import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { getCategories } from "../api/categories";
import { getNewsList } from "../api/news";
import NewsCard from "../components/NewsCard";
import { getNewsListCache, setNewsListCache } from "../store/newsListCache";
import { Category, NewsItem } from "../types";

const PULL_THRESHOLD = 70;
const PULL_MAX = 100;
const SCROLL_HEADER_THRESHOLD = 80;

export default function NewsList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  const pullYRef = useRef(0);
  const loadingGuardRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const pageRef = useRef(page);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    }).then((h) => {
      listenerHandle = h;
    });
    return () => {
      listenerHandle?.remove?.();
    };
  }, [navigate]);

  const fetchNews = useCallback(
    async (pageNum: number, isLoadMore = false) => {
      if (!id || loadingGuardRef.current) return;

      loadingGuardRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = await getNewsList(id, pageNum);
        if (res.code !== 200 || !res.data?.pageInfo) {
          throw new Error("Failed to fetch news");
        }

        const newNews = res.data.pageInfo.list || [];
        const nextHasMore = res.data.pageInfo.hasNext;

        setNews((prev) => (isLoadMore ? [...prev, ...newNews] : newNews));
        setHasMore(nextHasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        loadingGuardRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id && news.length > 0) {
      setNewsListCache(id, { news, page, hasMore });
    }
  }, [hasMore, id, news, page]);

  useEffect(() => {
    if (!id) return;
    getCategories()
      .then((list) => setCategory(list.find((c) => c.id === id) ?? null))
      .finally(() => setCategoriesLoading(false));
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderVisible(window.scrollY > SCROLL_HEADER_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    const cached = getNewsListCache(id);
    if (cached && cached.news.length > 0) {
      setNews(cached.news);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      return;
    }

    setNews([]);
    setPage(1);
    setHasMore(true);
    fetchNews(1);
  }, [fetchNews, id]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || news.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          fetchNews(pageRef.current + 1, true);
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNews, hasMore, news.length]);

  const onPullRefresh = useCallback(() => {
    if (!id || loadingGuardRef.current) return;
    setRefreshing(true);
    fetchNews(1);
  }, [fetchNews, id]);

  useEffect(() => {
    const startY = { current: 0 };
    const scrollYAtStart = { current: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      scrollYAtStart.current = window.scrollY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollYAtStart.current > 10) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const val = Math.min(dy, PULL_MAX);
        pullYRef.current = val;
        setPullY(val);
      }
    };

    const handleTouchEnd = () => {
      if (pullYRef.current >= PULL_THRESHOLD) {
        onPullRefresh();
      }
      pullYRef.current = 0;
      setPullY(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onPullRefresh]);

  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">Category not found</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 pt-safe shadow-sm transition-all duration-300 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-6 h-6 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-brand dark:group-hover:bg-emerald-500 transition-colors duration-300">
              <span className="text-white dark:text-slate-900 font-serif font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-serif font-bold tracking-[0.15em] text-gray-900 dark:text-gray-100 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors duration-300">
              Seventh Tone
            </span>
          </Link>
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto pb-32 overflow-x-hidden">
        <div
          className="max-w-4xl mx-auto flex items-center justify-center transition-all duration-200 pointer-events-none -mt-2 mb-2"
          style={{ height: pullY > 0 || refreshing ? 56 : 0, opacity: pullY > 0 || refreshing ? 1 : 0 }}
        >
          {refreshing ? (
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          ) : (
            <span className="text-xs text-gray-400">{pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
          )}
        </div>

        <div
          className={`relative w-[100vw] left-1/2 -translate-x-1/2 min-h-[200px] md:min-h-[240px] flex flex-col justify-end px-4 pt-safe pt-12 pb-8 md:px-10 overflow-hidden ${!category.tonePic ? "bg-gray-100 dark:bg-slate-800" : ""}`}
        >
          {category.tonePic && (
            <>
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${category.tonePic})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          )}
          <div className="relative z-10 max-w-4xl mx-auto w-full">
            <span className={`inline-block h-px w-6 mb-3 ${category.tonePic ? "bg-white/80" : "bg-brand"}`} />
            <span
              className={`block text-[10px] font-bold tracking-[0.3em] uppercase mb-2 ${category.tonePic ? "text-white/90" : "text-gray-500 dark:text-gray-400"}`}
            >
              Section
            </span>
            <h1
              className={`text-3xl md:text-5xl font-serif font-bold tracking-tight uppercase ${category.tonePic ? "text-white drop-shadow-md" : "text-gray-900 dark:text-gray-100"}`}
            >
              {category.title}
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-8">
          {category.description && (
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl text-sm md:text-base italic mb-10">{category.description}</p>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-10 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchNews(page)}
                className="px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-xs font-bold uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10">
            {news.map((item, index) => (
              <motion.div
                key={`${item.contId}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NewsCard news={item} />
              </motion.div>
            ))}
          </div>

          {loading && !refreshing && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}

          {hasMore && news.length > 0 && <div ref={sentinelRef} className="h-1" />}

          {!loading && !hasMore && news.length > 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">You've reached the end.</p>
          )}
        </div>
      </motion.div>
    </>
  );
}
