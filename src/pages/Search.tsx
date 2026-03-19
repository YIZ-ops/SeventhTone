import { useState, useCallback, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { getCategories } from "../api/categories";
import { searchNews } from "../api/search";
import type { Category, SearchResultItem } from "../types";
import { Search as SearchIcon, Loader2, ChevronDown, ArrowUpDown, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";

const PAGE_SIZE = 10;
const ALL_CATEGORIES_ID = "all-categories";
const ORDER_OPTIONS = [
  { label: "Newest", value: 1 as const },
  { label: "Oldest", value: 2 as const },
];

const SANITIZE_OPTIONS = {
  ADD_TAGS: ["font"],
  ADD_ATTR: ["color"],
};

const HIGHLIGHT_COLOR = "#065f46"; // 品牌绿，与 brand 一致

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatNewsTime(pubTime?: string, pubTimeLong?: number): string {
  const ts = pubTimeLong || (pubTime ? new Date(pubTime).getTime() : 0);
  if (!ts || Number.isNaN(ts)) return pubTime ?? "";
  if (Date.now() - ts > SEVEN_DAYS_MS) {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return formatDistanceToNow(new Date(ts), { addSuffix: true });
}

function sanitizeSentenceHtml(html: string | undefined): string {
  if (!html || typeof html !== "string") return "";
  const sanitized = DOMPurify.sanitize(html, SANITIZE_OPTIONS);
  // 将接口返回的橙色等高亮统一改为绿色
  return sanitized.replace(/color\s*=\s*["']?#?[^"'\s]+["']?/gi, `color="${HIGHLIGHT_COLOR}"`);
}

export default function Search() {
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [submitWord, setSubmitWord] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [orderType, setOrderType] = useState<1 | 2>(1);
  const [sheetMode, setSheetMode] = useState<"category" | null>(null);
  const [list, setList] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (searchWord: string, pageNum: number, append: boolean, categoryId: string, nextOrderType: 1 | 2) => {
    const w = searchWord.trim();
    if (!w) {
      setList([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchNews({
        word: w,
        nodeId: categoryId === ALL_CATEGORIES_ID ? undefined : categoryId,
        pageNum,
        pageSize: PAGE_SIZE,
        orderType: nextOrderType,
      });
      const items = res.data?.list ?? [];
      setList((prev) => (append ? [...prev, ...items] : items));
      setHasMore(res.data?.hasNext ?? false);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      if (!append) setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useAndroidBackHandler(() => {
    navigate("/home");
  });

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (cancelled) return;
        setCategories(list);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
      })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    setSubmitWord(w);
    setPage(1);
    doSearch(w, 1, false, selectedCategoryId, orderType);
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const pageRef = useRef(page);
  const submitWordRef = useRef(submitWord);
  const selectedCategoryRef = useRef(selectedCategoryId);
  const orderTypeRef = useRef(orderType);
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
    submitWordRef.current = submitWord;
  }, [submitWord]);
  useEffect(() => {
    selectedCategoryRef.current = selectedCategoryId;
  }, [selectedCategoryId]);
  useEffect(() => {
    orderTypeRef.current = orderType;
  }, [orderType]);

  const rerunSearch = useCallback(
    (nextCategoryId: string, nextOrderType: 1 | 2) => {
      if (!submitWordRef.current) return;
      setPage(1);
      doSearch(submitWordRef.current, 1, false, nextCategoryId, nextOrderType);
    },
    [doSearch],
  );

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSheetMode(null);
    rerunSearch(categoryId, orderTypeRef.current);
  };

  const handleOrderChange = (nextOrderType: 1 | 2) => {
    setOrderType(nextOrderType);
    rerunSearch(selectedCategoryRef.current, nextOrderType);
  };

  const selectedCategoryLabel =
    selectedCategoryId === ALL_CATEGORIES_ID
      ? "All categories"
      : categories.find((category) => category.id === selectedCategoryId)?.title || "All categories";
  const selectedOrderLabel = ORDER_OPTIONS.find((option) => option.value === orderType)?.label || "Newest";
  const sheetTitle = "Choose category";

  const toggleOrderType = () => {
    const nextOrderType = orderType === 1 ? 2 : 1;
    handleOrderChange(nextOrderType);
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || list.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current && submitWordRef.current) {
          doSearch(submitWordRef.current, pageRef.current + 1, true, selectedCategoryRef.current, orderTypeRef.current);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [doSearch, hasMore, list.length]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Search news..."
            className="w-full pl-12 pr-5 py-4 rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-brand transition-all"
            autoFocus
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!word.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-brand dark:hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mb-6 flex items-center justify-end gap-4 border-b border-gray-200/80 pb-3 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setSheetMode("category")}
          className="group flex min-w-0 shrink-0 items-center gap-2 text-left text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span className="max-w-[min(52vw,18rem)] truncate font-medium text-gray-800 dark:text-gray-100">{selectedCategoryLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={toggleOrderType}
          className="group flex shrink-0 items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span className="font-medium text-gray-800 dark:text-gray-100">{selectedOrderLabel}</span>
          <ArrowUpDown className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm">{error}</div>}

      {submitWord && !loading && list.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No results for &quot;{submitWord}&quot;</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {list.map((item, index) => {
          const imgSrc = item.pic || item.appHeadPic;
          const safeTitle = sanitizeSentenceHtml(item.name);
          const safeSummary = item.summary ? sanitizeSentenceHtml(item.summary) : "";
          return (
            <motion.div
              key={`${item.contId}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/news/${item.contId}`}
                className="group block bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-600 overflow-hidden hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.3)] transition-all active:scale-[0.99]"
              >
                {/* 左右布局：图片左侧，标题+时间右侧 */}
                <div className="flex p-4 gap-4">
                  <div className="w-24 sm:w-28 shrink-0 aspect-[4/3] rounded-xl bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        <SearchIcon size={22} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {(item.nodeInfo?.name || item.pubTime || item.pubTimeLong) && (
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="inline-block text-[10px] font-bold tracking-wider text-brand dark:text-emerald-400 uppercase truncate">
                          {item.nodeInfo?.name || ""}
                        </span>
                        {(item.pubTime || item.pubTimeLong) && (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {formatNewsTime(item.pubTime, item.pubTimeLong)}
                          </span>
                        )}
                      </div>
                    )}
                    <h3
                      className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors [&_font]:text-brand"
                      dangerouslySetInnerHTML={{ __html: safeTitle }}
                    />
                  </div>
                </div>
                {/* summary 下方整行 */}
                {safeSummary && (
                  <div className="px-4 pb-4 pt-0">
                    <p
                      className="text-gray-500 dark:text-gray-400 leading-[1.6] line-clamp-2 [&_font]:text-brand dark:[&_font]:text-emerald-400 text-sm md:text-base italic"
                      dangerouslySetInnerHTML={{ __html: safeSummary }}
                    />
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      )}

      {hasMore && list.length > 0 && <div ref={sentinelRef} className="h-1" />}

      {!loading && !hasMore && list.length > 0 && <p className="text-center text-gray-400 text-sm mt-8">End of results</p>}

      {sheetMode && (
        <div className="fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close filter sheet" onClick={() => setSheetMode(null)} />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white px-5 pb-8 pt-5 shadow-[0_-24px_80px_-24px_rgba(15,23,42,0.45)] dark:bg-slate-900">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-slate-700" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{sheetTitle}</h2>
              <button
                type="button"
                onClick={() => setSheetMode(null)}
                className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => handleCategoryChange(ALL_CATEGORIES_ID)}
                className={`flex w-full items-center justify-between py-3 text-left text-[15px] transition-colors ${
                  selectedCategoryId === ALL_CATEGORIES_ID
                    ? "font-semibold text-brand dark:text-emerald-300"
                    : "text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
                }`}
              >
                <span>All categories</span>
                {selectedCategoryId === ALL_CATEGORIES_ID && <Check className="h-4 w-4 shrink-0" />}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex w-full items-center justify-between py-3 text-left text-[15px] transition-colors ${
                    selectedCategoryId === category.id
                      ? "font-semibold text-brand dark:text-emerald-300"
                      : "text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
                  }`}
                >
                  <span>{category.title}</span>
                  {selectedCategoryId === category.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
