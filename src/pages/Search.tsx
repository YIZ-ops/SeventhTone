import { useState, useCallback, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import DOMPurify from "dompurify";
import { searchNews } from "../api/api";
import type { SearchResultItem } from "../types";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";

const PAGE_SIZE = 10;

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
  const [list, setList] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (searchWord: string, pageNum: number, append: boolean) => {
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
        pageNum: pageNum,
        pageSize: PAGE_SIZE,
        orderType: 1,
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

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let handle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", () => {
      navigate("/");
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove?.();
    };
  }, [navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    setSubmitWord(w);
    setPage(1);
    doSearch(w, 1, false);
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const pageRef = useRef(page);
  const submitWordRef = useRef(submitWord);
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
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current && submitWordRef.current) {
          doSearch(submitWordRef.current, pageRef.current + 1, true);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [doSearch]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
      <header className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <span className="h-px w-8 bg-brand dark:bg-emerald-400" />
          <span className="text-xs font-extrabold tracking-[0.2em] text-brand dark:text-emerald-400 uppercase">Search</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-gray-100 tracking-tight">Search</h1>
      </header>

      <form onSubmit={handleSubmit} className="mb-10">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Search news..."
            className="w-full pl-12 pr-5 py-4 rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
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

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm">{error}</div>}

      {submitWord && !loading && list.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No results for &quot;{submitWord}&quot;</p>
      )}

      <div className="grid grid-cols-1 gap-6">
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
                    {item.nodeInfo?.name && (
                      <span className="inline-block text-[10px] font-bold tracking-wider text-brand dark:text-emerald-400 uppercase mb-1">
                        {item.nodeInfo.name}
                      </span>
                    )}
                    <h3
                      className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors [&_font]:text-brand"
                      dangerouslySetInnerHTML={{ __html: safeTitle }}
                    />
                    {(item.pubTime || item.pubTimeLong) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatNewsTime(item.pubTime, item.pubTimeLong)}</span>
                    )}
                  </div>
                </div>
                {/* summary 下方整行 */}
                {safeSummary && (
                  <div className="px-4 pb-4 pt-0">
                    <p
                      className="text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 [&_font]:text-brand dark:[&_font]:text-emerald-400 text-sm md:text-base italic"
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
    </div>
  );
}
