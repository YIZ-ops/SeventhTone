import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getArticleList, getCategories } from "../api/api";
import { ArticleItem, Category } from "../types";
import ArticleCard from "../components/ArticleCard";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { getArticleListCache, setArticleListCache } from "../store/articleListCache";
import { useSwipeBack } from "../hooks/useSwipeBack";

const PULL_THRESHOLD = 70;
const PULL_MAX = 100;
const SCROLL_HEADER_THRESHOLD = 80;

export default function ArticleList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useSwipeBack();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const pullYRef = useRef(0);

  const fetchArticles = useCallback(
    async (pageNum: number, isLoadMore: boolean = false) => {
      if (!id || loading) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getArticleList(id, pageNum);
        if (res.code === 200 && res.data?.pageInfo) {
          const newArticles = res.data.pageInfo.list || [];
          const nextHasMore = res.data.pageInfo.hasNext;
          setArticles((prev) => (isLoadMore ? [...prev, ...newArticles] : newArticles));
          setHasMore(nextHasMore);
          setPage(pageNum);
        } else {
          throw new Error("Failed to fetch articles");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id && articles.length > 0) {
      setArticleListCache(id, { articles, page, hasMore });
    }
  }, [id, articles, page, hasMore]);

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
    const cached = getArticleListCache(id);
    if (cached && cached.articles.length > 0) {
      setArticles(cached.articles);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      return;
    }
    setArticles([]);
    setPage(1);
    setHasMore(true);
    fetchArticles(1);
  }, [id, fetchArticles]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchArticles(page + 1, true);
    }
  };

  const onPullRefresh = useCallback(() => {
    if (!loading && id) {
      setRefreshing(true);
      fetchArticles(1);
    }
  }, [loading, id, fetchArticles]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <p className="text-red-600 font-medium mb-4">Category not found</p>
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
      {/* 下滑后出现的固定顶栏 */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 pt-safe shadow-sm transition-all duration-300 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
              <span className="text-white font-serif font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-serif font-bold tracking-[0.15em] text-gray-900 group-hover:text-brand transition-colors duration-300">
              Seventh Tone
            </span>
          </Link>
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto pb-32 overflow-x-hidden">
        {/* 移动端下拉刷新指示器 */}
        <div
          className="max-w-4xl mx-auto flex items-center justify-center transition-all duration-200 pointer-events-none -mt-2 mb-2"
          style={{ height: pullY > 0 || refreshing ? 56 : 0, opacity: pullY > 0 || refreshing ? 1 : 0 }}
        >
          {refreshing ? (
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          ) : (
            <span className="text-xs text-gray-400">
              {pullY >= PULL_THRESHOLD ? "释放刷新" : "下拉刷新"}
            </span>
          )}
        </div>

        {/* Banner：全宽铺满视口，图片居中覆盖 */}
        <div
          className={`relative w-[100vw] left-1/2 -translate-x-1/2 min-h-[200px] md:min-h-[240px] flex flex-col justify-end px-4 pt-safe pt-12 pb-8 md:px-10 overflow-hidden ${!category.tonePic ? "bg-gray-100" : ""}`}
        >
          {category.tonePic && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${category.tonePic})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          )}
          <div className="relative z-10 max-w-4xl mx-auto w-full">
            <span className={`inline-block h-px w-6 mb-3 ${category.tonePic ? "bg-white/80" : "bg-brand"}`} />
            <span className={`block text-[10px] font-bold tracking-[0.3em] uppercase mb-2 ${category.tonePic ? "text-white/90" : "text-gray-500"}`}>Section</span>
            <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight uppercase ${category.tonePic ? "text-white drop-shadow-md" : "text-gray-900"}`}>
              {category.title}
            </h1>
          </div>
        </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {category.description && (
          <p className="text-gray-500 leading-relaxed max-w-2xl text-sm md:text-base italic font-serif mb-10">
            {category.description}
          </p>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl mb-10 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchArticles(page)}
              className="px-4 py-2 bg-white rounded-full shadow-sm text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10">
          {articles.map((article, index) => (
            <motion.div
              key={`${article.contId}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ArticleCard article={article} />
            </motion.div>
          ))}
        </div>

        {loading && !refreshing && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}

        {!loading && hasMore && articles.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && !hasMore && articles.length > 0 && <p className="text-center text-gray-500 mt-8 text-sm">You've reached the end.</p>}
      </div>
      </motion.div>
    </>
  );
}
