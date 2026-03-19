import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Loader2, Menu, Search as SearchIcon } from "lucide-react";
import { motion } from "motion/react";
import { getCategories } from "../api/categories";
import { getNewsList, getNewsListByTopic } from "../api/news";
import HomeCategoryDrawer from "../components/home/HomeCategoryDrawer";
import NewsCard from "../components/news/NewsCard";
import { getNewsListCache, setNewsListCache } from "../store/newsListCache";
import { Category, NewsItem } from "../types";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";

const PULL_THRESHOLD = 70;
const PULL_MAX = 100;
const SCROLL_HEADER_THRESHOLD = 80;

export default function NewsList() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isTopicMode = Boolean(topicId);
  const listId = isTopicMode ? topicId : id;
  const cacheKey = listId ? (isTopicMode ? `topic-${listId}` : listId) : "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [topicMeta, setTopicMeta] = useState<{ title: string; description?: string; tonePic?: string } | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(!isTopicMode);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pullYRef = useRef(0);
  const loadingGuardRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const pageRef = useRef(page);

  useAndroidBackHandler(({ canGoBack }) => {
    if (drawerOpen) {
      setDrawerOpen(false);
      return;
    }
    if (canGoBack) {
      navigate(-1);
      return;
    }
    CapacitorApp.exitApp();
  });

  const fetchNews = useCallback(
    async (pageNum: number, isLoadMore = false) => {
      if (!listId || loadingGuardRef.current) return;

      loadingGuardRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = isTopicMode ? await getNewsListByTopic(listId, pageNum) : await getNewsList(listId, pageNum);
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
    [isTopicMode, listId],
  );

  useEffect(() => {
    if (cacheKey && news.length > 0) {
      setNewsListCache(cacheKey, { news, page, hasMore });
    }
  }, [cacheKey, hasMore, news, page]);

  useEffect(() => {
    let cancelled = false;
    if (!isTopicMode) {
      setCategoriesLoading(true);
    }

    getCategories()
      .then((list) => {
        if (cancelled) return;
        setCategories(list);
        if (!isTopicMode) {
          setCategory(list.find((c) => c.id === id) ?? null);
        }
      })
      .catch(() => {
        if (cancelled || isTopicMode) return;
        setCategory(null);
      })
      .finally(() => {
        if (!cancelled && !isTopicMode) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, isTopicMode]);

  useEffect(() => {
    if (!isTopicMode) {
      setTopicMeta(null);
      return;
    }
    const state = (location.state as { topicName?: string; topicDesc?: string; topicBg?: string } | null) ?? null;
    const title = state?.topicName || (topicId ? `Topic ${topicId}` : "Topic");
    setTopicMeta({
      title,
      description: state?.topicDesc,
      tonePic: state?.topicBg,
    });
  }, [isTopicMode, location.state, topicId]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [listId]);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderVisible(window.scrollY > SCROLL_HEADER_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!listId) return;
    const cached = cacheKey ? getNewsListCache(cacheKey) : null;
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
  }, [cacheKey, fetchNews, listId]);

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
    if (!listId || loadingGuardRef.current) return;
    setRefreshing(true);
    fetchNews(1);
  }, [fetchNews, listId]);

  const openCategoryDrawer = useCallback(() => {
    if (categories.length === 0) return;
    setDrawerOpen(true);
  }, [categories.length]);

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

  const displayMeta = isTopicMode ? topicMeta : category;
  const solidHeader = headerVisible;
  const transparentHeaderOnImage = Boolean(displayMeta?.tonePic) && !solidHeader;
  const headerActionClass = transparentHeaderOnImage
    ? "text-white/90 hover:text-white"
    : "text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-emerald-400";

  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
      </div>
    );
  }

  if (!isTopicMode && !category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">Category not found</p>
          <button
            onClick={() => navigate("/home")}
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
      <HomeCategoryDrawer open={drawerOpen} categories={categories} onClose={() => setDrawerOpen(false)} />

      <header
        className={`fixed top-0 left-0 right-0 z-40 pt-safe transition-all duration-300 ${
          solidHeader
            ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm"
            : "bg-transparent border-b border-transparent backdrop-blur-0"
        }`}
      >
        <div className="mx-auto flex h-11 max-w-4xl items-center gap-1 px-2">
          <div className="flex w-16 shrink-0 items-center">
            <button
              type="button"
              onClick={openCategoryDrawer}
              className={`group p-2 transition-colors ${headerActionClass}`}
              aria-label="Open categories"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="min-w-0 flex flex-1 items-center justify-center" />

          <div className="flex w-16 shrink-0 items-center justify-end">
            <Link to="/search" className={`group p-2 transition-colors ${headerActionClass}`} aria-label="Search">
              <SearchIcon size={18} />
            </Link>
          </div>
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
          className={`relative w-[100vw] left-1/2 -translate-x-1/2 min-h-[340px] md:min-h-[420px] flex flex-col justify-end px-4 pt-safe pt-32 pb-8 md:px-10 overflow-hidden ${!displayMeta?.tonePic ? "bg-gray-100 dark:bg-slate-800" : ""}`}
        >
          {displayMeta?.tonePic && (
            <>
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${displayMeta.tonePic})` }} />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          )}
          <div className="relative z-10 max-w-4xl mx-auto w-full">
            <span
              className={`block text-[10px] font-bold tracking-[0.3em] uppercase mb-2 ${displayMeta?.tonePic ? "text-white/90" : "text-gray-500 dark:text-gray-400"}`}
            >
              {isTopicMode ? "Topic" : "Section"}
            </span>
            <h1
              className={`text-3xl md:text-5xl font-serif font-bold tracking-tight uppercase ${displayMeta?.tonePic ? "text-white drop-shadow-md" : "text-gray-900 dark:text-gray-100"}`}
            >
              {displayMeta?.title || (isTopicMode ? "Topic" : "")}
            </h1>
            {displayMeta?.description && (
              <p
                className={`mt-5 md:mt-6 max-w-2xl text-sm md:text-base italic leading-[1.6] ${
                  displayMeta?.tonePic ? "text-white/90 drop-shadow-sm" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {displayMeta.description}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-4">
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

          <div className="grid grid-cols-1 gap-4">
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
            <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">You've reached the end</p>
          )}
        </div>
      </motion.div>
    </>
  );
}
