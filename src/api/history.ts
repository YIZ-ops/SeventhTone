import type { NewsItem } from "../types";

// Local storage for history (带阅读时间，用于只显示“今天读过”)
const HISTORY_KEY = "seventhtone_reading_history";

export interface HistoryEntry {
  news: NewsItem;
  readAt: number;
}

function getHistoryRaw(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => {
      if (item && typeof item === "object" && "news" in item && "readAt" in item) {
        return item as HistoryEntry;
      }
      return { news: item as NewsItem, readAt: 0 };
    });
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

export const getHistoryEntriesToday = (): HistoryEntry[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  return getHistoryRaw().filter((e) => e.readAt >= startOfToday && e.readAt < startOfTomorrow);
};

export const getHistory = (): NewsItem[] => {
  return getHistoryEntriesToday().map((e) => e.news);
};

export const addHistory = (news: NewsItem) => {
  try {
    const raw = getHistoryRaw();
    const readAt = Date.now();
    const newRaw = [{ news, readAt }, ...raw.filter((e) => e.news.contId !== news.contId)].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newRaw));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
