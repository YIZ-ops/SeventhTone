import type { NewsDetail } from "../types";

const detailCache = new Map<number, NewsDetail>();

export function getNewsDetailCache(contId: number): NewsDetail | null {
  return detailCache.get(contId) ?? null;
}

export function setNewsDetailCache(contId: number, detail: NewsDetail): void {
  detailCache.set(contId, detail);
}
