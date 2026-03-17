import type { NewsDetail } from "../types";
import { createExpiringMemoryCache } from "./cache";

const NEWS_DETAIL_CACHE_TTL_MS = 15 * 60 * 1000;
const detailCache = createExpiringMemoryCache<number, NewsDetail>(NEWS_DETAIL_CACHE_TTL_MS);

export function getNewsDetailCache(contId: number): NewsDetail | null {
  return detailCache.get(contId);
}

export function setNewsDetailCache(contId: number, detail: NewsDetail): void {
  detailCache.set(contId, detail);
}
