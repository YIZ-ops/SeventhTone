import type { NewsItem } from "../types";

export interface NewsListCacheItem {
  news: NewsItem[];
  page: number;
  hasMore: boolean;
}

const cache: Record<string, NewsListCacheItem> = {};

export function getNewsListCache(categoryId: string): NewsListCacheItem | null {
  return cache[categoryId] ?? null;
}

export function setNewsListCache(categoryId: string, data: NewsListCacheItem): void {
  cache[categoryId] = data;
}
