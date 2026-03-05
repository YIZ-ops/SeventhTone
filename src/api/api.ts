import { request } from "../utils/request";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { ArticleListResponse, ArticleItem, Bookmark, Highlight, WebNode, Category, SearchResponse } from "../types";

const BASE_URL = "https://api.sixthtone.com";
const SIXTH_TONE_WEB_BASE = "https://www.sixthtone.com";
const DEFAULT_BUILD_ID = "hb8D50A9NRCU31JdhQhE1";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

export const getDailyTonesCalendar = async (yearMonth: string) => {
  const res = await request<any>(`${BASE_URL}/cont/detail/dailyTones/calendar/${yearMonth}`, {
    method: "GET",
  });

  if (res?.code !== 200 || !Array.isArray(res?.data?.calendar)) {
    throw new Error("Failed to fetch daily tones calendar.");
  }

  return res;
};

const getDailyTonesByNodeId = async (nodeId: string | number) => {
  const res = await request<any>(`${BASE_URL}/cont/detail/dailyTones/data/${nodeId}`, {
    method: "GET",
  });

  if (res?.code !== 200 || !Array.isArray(res?.data?.contList)) {
    throw new Error("Failed to fetch daily tones data");
  }

  const contList = (res.data.contList as any[]).map((item) => ({
    ...item,
    appHeadPic: item.appHeadPic || item.pic,
    summary: item.summary || "",
    pubTime: item.pubTime || "",
    pubTimeLong: typeof item.pubTimeLong === "number" ? item.pubTimeLong : Date.now(),
  })) as ArticleItem[];

  return {
    ...res,
    data: {
      ...res.data,
      contList,
    },
  };
};

export const getDailyTonesByDate = async (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new Error("Invalid date for Daily Tones.");
  }

  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const yearMonth = `${year}${month}`;
  const monthDay = `${month}${day}`;

  const calendarRes = await getDailyTonesCalendar(yearMonth);

  const dayEntry = calendarRes.data.calendar.find((entry: any) => entry?.monthDay === monthDay);
  const nodeId = dayEntry?.nodeList?.[0]?.nodeId;
  if (!nodeId) {
    return {
      code: 200,
      data: {
        dateInfo: { year, month, day },
        contList: [],
      },
    };
  }

  return await getDailyTonesByNodeId(nodeId);
};

const isNativeRuntime = () => {
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  return Capacitor.isNativePlatform() || protocol === "capacitor:" || protocol === "file:";
};

const normalizeArticleDetailResponse = (res: any) => {
  if (res && res.contId && res.content) {
    return { data: res };
  }
  if (res && res.data) {
    return res;
  }
  return null;
};

const parseSixthToneDetail = (payload: any) => payload?.pageProps?.detailData;

const fetchSixthToneDetailByBuildId = async (contId: string, buildId: string) => {
  const url = `${SIXTH_TONE_WEB_BASE}/_next/data/${buildId}/news/${contId}.json?contId=${contId}`;
  const response = await CapacitorHttp.request({
    method: "GET",
    url,
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent": MOBILE_UA,
    },
  });

  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load article detail JSON: ${response?.status ?? "unknown"}`);
  }

  const detailData = parseSixthToneDetail(response.data);
  if (!detailData) {
    throw new Error("Article detail payload is missing.");
  }
  return detailData;
};

const resolveLatestBuildIdFromArticleHtml = async (contId: string) => {
  const articleUrl = `${SIXTH_TONE_WEB_BASE}/news/${contId}`;
  const htmlResponse = await CapacitorHttp.request({
    method: "GET",
    url: articleUrl,
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": MOBILE_UA,
    },
  });
  const html = typeof htmlResponse?.data === "string" ? htmlResponse.data : "";
  const match = html.match(/"buildId":"([^"]+)"/);
  return match?.[1] ?? null;
};

const getArticleDetailFromSixthToneNative = async (contId: string) => {
  try {
    return await fetchSixthToneDetailByBuildId(contId, DEFAULT_BUILD_ID);
  } catch {
    const latestBuildId = await resolveLatestBuildIdFromArticleHtml(contId);
    if (!latestBuildId) {
      throw new Error("Failed to resolve latest buildId from article HTML.");
    }
    return await fetchSixthToneDetailByBuildId(contId, latestBuildId);
  }
};

const getArticleDetailFromBackendRelay = async (contId: string, backendBase: string, isNative: boolean) => {
  const candidates = isNative
    ? [backendBase ? `${backendBase}/api/article/${contId}` : ""].filter(Boolean)
    : ["/api/article/" + contId, backendBase ? `${backendBase}/api/article/${contId}` : "", "http://localhost:3000/api/article/" + contId].filter(
        Boolean,
      );

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      const res = await request<any>(url, { method: "GET" });
      const normalized = normalizeArticleDetailResponse(res);
      if (normalized) return normalized;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to load article detail from backend.");
};

/** 获取全部节点（分类）原始接口 */
export const getWebAllNodes = async () => {
  const res = await request<{ code: number; data: { nodeList: WebNode[] } }>(
    `${BASE_URL}/node/getWebAllNodes`,
    { method: "GET" }
  );
  if (res?.code !== 200 || !Array.isArray(res?.data?.nodeList)) {
    throw new Error("Failed to fetch nodes.");
  }
  return res;
};

let categoriesCache: Category[] | null = null;

/** 获取分类列表（映射为前端 Category，带缓存） */
export const getCategories = async (): Promise<Category[]> => {
  if (categoriesCache) return categoriesCache;
  const res = await getWebAllNodes();
  const list = res.data.nodeList ?? [];
  categoriesCache = list
    .filter((node) => node.nodeType === 0 && node.name !== "DAILY TONES")
    .map((node) => ({
      id: String(node.nodeId),
      title: node.name,
      description: node.description || "",
      pic: node.pic,
      tonePic: node.tonePic,
    }));
  return categoriesCache;
};

export interface SearchNewsParams {
  word: string;
  pageNum?: number;
  pageSize?: number;
  orderType?: number;
}

/** 搜索新闻：POST /search/news */
export const searchNews = async (params: SearchNewsParams) => {
  const { word, pageNum = 1, pageSize = 10, orderType = 1 } = params;
  const res = await request<SearchResponse>(`${BASE_URL}/search/news`, {
    method: "POST",
    body: JSON.stringify({ word, pageNum, pageSize, orderType }),
  });
  if (res?.code !== 200 || !res?.data) {
    throw new Error("Failed to search.");
  }
  return res;
};

export const getArticleList = async (nodeId: string, pageNum: number, pageSize: number = 20) => {
  const res = await request<ArticleListResponse>(`${BASE_URL}/cont/nodeCont/getByNodeId`, {
    method: "POST",
    body: JSON.stringify({ nodeId, pageNum, pageSize }),
  });

  if (res?.data?.pageInfo?.list) {
    res.data.pageInfo.list = res.data.pageInfo.list.filter((item: any) => {
      return !(item?.name === "MOST READ" && String(item?.cardMode) === "5");
    });
  }

  return res;
};

export const getArticleDetail = async (contId: string) => {
  const backendBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  const isNative = isNativeRuntime();

  // Native first: direct request to Seventh Tone via CapacitorHttp (OkHttp on Android).
  if (isNative) {
    try {
      return await getArticleDetailFromSixthToneNative(contId);
    } catch (nativeError) {
      if (!backendBase) {
        throw nativeError;
      }
      // fallback to configured backend relay
    }
  }

  return await getArticleDetailFromBackendRelay(contId, backendBase, isNative);
};

// Local storage for history (带阅读时间，用于只显示“今天读过”)
const HISTORY_KEY = "sixthtone_reading_history";

export interface HistoryEntry {
  article: ArticleItem;
  readAt: number;
}

function getHistoryRaw(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => {
      if (item && typeof item === "object" && "article" in item && "readAt" in item) {
        return item as HistoryEntry;
      }
      return { article: item as ArticleItem, readAt: 0 };
    });
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

/** 仅返回今天（本地日期）阅读过的条目（含阅读时间），供 History 页展示 */
export const getHistoryEntriesToday = (): HistoryEntry[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  return getHistoryRaw().filter((e) => e.readAt >= startOfToday && e.readAt < startOfTomorrow);
};

/** 仅返回今天阅读过的文章列表（兼容用） */
export const getHistory = (): ArticleItem[] => {
  return getHistoryEntriesToday().map((e) => e.article);
};

export const addHistory = (article: ArticleItem) => {
  try {
    const raw = getHistoryRaw();
    const readAt = Date.now();
    const newRaw = [
      { article, readAt },
      ...raw.filter((e) => e.article.contId !== article.contId),
    ].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newRaw));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

// Local storage for bookmarks
const BOOKMARKS_KEY = "sixthtone_bookmarks";

export const getBookmarks = (): Bookmark[] => {
  try {
    const bookmarks = localStorage.getItem(BOOKMARKS_KEY);
    return bookmarks ? JSON.parse(bookmarks) : [];
  } catch (e) {
    console.error("Failed to parse bookmarks", e);
    return [];
  }
};

export const addBookmark = (article: ArticleItem, category: string) => {
  try {
    const bookmarks = getBookmarks();
    const newBookmark: Bookmark = { article, category, CollectedAt: Date.now() };
    const newBookmarks = [newBookmark, ...bookmarks.filter((b) => b.article.contId !== article.contId)];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
  } catch (e) {
    console.error("Failed to save bookmark", e);
  }
};

export const removeBookmark = (contId: number) => {
  try {
    const bookmarks = getBookmarks();
    const newBookmarks = bookmarks.filter((b) => b.article.contId !== contId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
  } catch (e) {
    console.error("Failed to remove bookmark", e);
  }
};

export const getBookmarkCategories = (): string[] => {
  const bookmarks = getBookmarks();
  // Filter out empty/falsy categories so deleted-category items (category="") are excluded
  const categories = new Set(bookmarks.map((b) => b.category).filter(Boolean) as string[]);
  return Array.from(categories);
};

/** 删除书签分类：将该分类下的书签 category 清空（""），使其只出现在 "All" 视图下 */
export const reassignBookmarkCategory = (fromCategory: string, defaultCategory = "") => {
  try {
    const bookmarks = getBookmarks();
    const updated = bookmarks.map((b) => (b.category === fromCategory ? { ...b, category: defaultCategory } : b));
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to reassign bookmark category", e);
  }
};

// Local storage for highlights
const HIGHLIGHTS_KEY = "sixthtone_highlights";

export const getHighlights = (contId: number): Highlight[] => {
  try {
    const allHighlights = localStorage.getItem(HIGHLIGHTS_KEY);
    const parsed = allHighlights ? JSON.parse(allHighlights) : {};
    return parsed[contId] || [];
  } catch (e) {
    console.error("Failed to parse highlights", e);
    return [];
  }
};

export const getAllHighlights = (): Highlight[] => {
  try {
    const allHighlightsStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allHighlights = allHighlightsStr ? JSON.parse(allHighlightsStr) : {};
    const result: Highlight[] = [];
    for (const contId of Object.keys(allHighlights)) {
      result.push(...allHighlights[contId]);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Failed to parse highlights", e);
    return [];
  }
};

export const addHighlight = (
  contId: number,
  text: string,
  articleName?: string,
  start?: number,
  length?: number,
  category?: string,
  thought?: string,
) => {
  try {
    const allHighlightsStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allHighlights = allHighlightsStr ? JSON.parse(allHighlightsStr) : {};
    const articleHighlights: Highlight[] = allHighlights[contId] || [];

    const hasSameRange =
      typeof start === "number" && typeof length === "number" && articleHighlights.some((h) => h.start === start && h.length === length);
    if (hasSameRange) return;

    const newHighlight: Highlight = {
      id: Math.random().toString(36).substring(2, 9),
      contId,
      text,
      articleName,
      category: category || "Highlights",
      thought: thought?.trim() || undefined,
      start,
      length,
      createdAt: Date.now(),
    };

    allHighlights[contId] = [...articleHighlights, newHighlight];
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allHighlights));
  } catch (e) {
    console.error("Failed to save highlight", e);
  }
};

/** 高亮用到的全部分类（书签分类 + 已有高亮分类，去重） */
export const getHighlightCategories = (): string[] => {
  // Only use categories from actual highlights (don't mix in bookmark categories —
  // that caused deleted highlight-categories to reappear via the bookmark side).
  const fromHighlights = new Set<string>();
  getAllHighlights().forEach((h) => {
    if (h.category) fromHighlights.add(h.category);
  });
  // Always offer "Highlights" as the fallback option
  if (!fromHighlights.has("Highlights")) fromHighlights.add("Highlights");
  return Array.from(fromHighlights);
};

/** 删除高亮分类：将该分类下的高亮 category 清空（""），使其只出现在 "All" 视图下 */
export const reassignHighlightCategory = (fromCategory: string, defaultCategory = "") => {
  try {
    const allStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const all = allStr ? JSON.parse(allStr) : {};
    for (const contId of Object.keys(all)) {
      all[contId] = (all[contId] as Highlight[]).map((h) =>
        (h.category || "Highlights") === fromCategory ? { ...h, category: defaultCategory } : h,
      );
    }
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to reassign highlight category", e);
  }
};

export const removeHighlight = (contId: number, highlightId: string) => {
  try {
    const allHighlightsStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allHighlights = allHighlightsStr ? JSON.parse(allHighlightsStr) : {};
    if (allHighlights[contId]) {
      allHighlights[contId] = allHighlights[contId].filter((h: Highlight) => h.id !== highlightId);
      localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allHighlights));
    }
  } catch (e) {
    console.error("Failed to remove highlight", e);
  }
};

export const updateHighlight = (contId: number, highlightId: string, updates: { thought?: string; category?: string }) => {
  try {
    const allHighlightsStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allHighlights = allHighlightsStr ? JSON.parse(allHighlightsStr) : {};
    if (allHighlights[contId]) {
      allHighlights[contId] = (allHighlights[contId] as Highlight[]).map((h) =>
        h.id === highlightId
          ? {
              ...h,
              ...(updates.category !== undefined ? { category: updates.category } : {}),
              thought: updates.thought?.trim() || undefined,
            }
          : h,
      );
      localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allHighlights));
    }
  } catch (e) {
    console.error("Failed to update highlight", e);
  }
};
