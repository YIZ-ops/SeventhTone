import type { NewsItem } from "../types";
import { createExpiringMemoryCache } from "./cache";

export interface NewsListCacheItem {
  news: NewsItem[];
  page: number;
  hasMore: boolean;
}

const NEWS_LIST_CACHE_TTL_MS = 10 * 60 * 1000;
const cache = createExpiringMemoryCache<string, NewsListCacheItem>(NEWS_LIST_CACHE_TTL_MS);

export function getNewsListCache(categoryId: string): NewsListCacheItem | null {
  return cache.get(categoryId);
}

export function setNewsListCache(categoryId: string, data: NewsListCacheItem): void {
  cache.set(categoryId, data);
}
