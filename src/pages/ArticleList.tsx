import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArticleList } from "../api/api";
import { ArticleItem } from "../types";
import ArticleCard from "../components/ArticleCard";
import { Loader2 } from "lucide-react";
import { CATEGORIES } from "../constants";
import { motion } from "motion/react";

export default function ArticleList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const category = CATEGORIES.find((c) => c.id === id);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(
    async (pageNum: number, isLoadMore: boolean = false) => {
      if (!id || loading) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getArticleList(id, pageNum);
        if (res.code === 200 && res.data?.pageInfo) {
          const newArticles = res.data.pageInfo.list || [];
          setArticles((prev) => (isLoadMore ? [...prev, ...newArticles] : newArticles));
          setHasMore(res.data.pageInfo.hasNext);
          setPage(pageNum);
        } else {
          throw new Error("Failed to fetch articles");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="mb-12">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-px w-6 bg-brand"></span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-brand uppercase">Section</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4 tracking-tight uppercase">{category.title}</h1>
        <p className="text-gray-500 leading-relaxed max-w-2xl text-sm md:text-base italic font-serif">{category.description}</p>
      </div>

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

      {loading && (
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
    </motion.div>
  );
}
