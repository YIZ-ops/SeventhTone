import type { ArticleItem } from "../types";

export interface ArticleListCacheItem {
  articles: ArticleItem[];
  page: number;
  hasMore: boolean;
}

const cache: Record<string, ArticleListCacheItem> = {};

export function getArticleListCache(categoryId: string): ArticleListCacheItem | null {
  return cache[categoryId] ?? null;
}

export function setArticleListCache(categoryId: string, data: ArticleListCacheItem): void {
  cache[categoryId] = data;
}
