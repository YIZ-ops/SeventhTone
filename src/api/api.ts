import { request } from "../utils/request";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { ArticleListResponse, ArticleItem, Bookmark, Highlight } from "../types";

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

// Local storage for history
const HISTORY_KEY = "sixthtone_reading_history";

export const getHistory = (): ArticleItem[] => {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
};

export const addHistory = (article: ArticleItem) => {
  try {
    const history = getHistory();
    const newHistory = [article, ...history.filter((item) => item.contId !== article.contId)].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
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
  const categories = new Set(bookmarks.map((b) => b.category));
  return Array.from(categories);
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

export const addHighlight = (contId: number, text: string, articleName?: string, start?: number, length?: number) => {
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
