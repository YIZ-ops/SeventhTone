import { request } from "../utils/request";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { NewsListResponse, NewsItem, Bookmark, Sentence, WebNode, Category, SearchResponse, VocabWord } from "../types";
import { formatQuoteText } from "../utils/quoteText";
import { getCategoriesCache, setCategoriesCache } from "../store/categoriesCache";

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
  })) as NewsItem[];

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

const normalizeNewsDetailResponse = (res: any) => {
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
    throw new Error(`Failed to load news detail JSON: ${response?.status ?? "unknown"}`);
  }

  const detailData = parseSixthToneDetail(response.data);
  if (!detailData) {
    throw new Error("News detail payload is missing.");
  }
  return detailData;
};

const resolveLatestBuildIdFromNewsHtml = async (contId: string) => {
  const newsUrl = `${SIXTH_TONE_WEB_BASE}/news/${contId}`;
  const htmlResponse = await CapacitorHttp.request({
    method: "GET",
    url: newsUrl,
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": MOBILE_UA,
    },
  });
  const html = typeof htmlResponse?.data === "string" ? htmlResponse.data : "";
  const match = html.match(/"buildId":"([^"]+)"/);
  return match?.[1] ?? null;
};

const getNewsDetailFromSixthToneNative = async (contId: string) => {
  try {
    return await fetchSixthToneDetailByBuildId(contId, DEFAULT_BUILD_ID);
  } catch {
    const latestBuildId = await resolveLatestBuildIdFromNewsHtml(contId);
    if (!latestBuildId) {
      throw new Error("Failed to resolve latest buildId from news HTML.");
    }
    return await fetchSixthToneDetailByBuildId(contId, latestBuildId);
  }
};

const getNewsDetailFromBackendRelay = async (contId: string, backendBase: string, isNative: boolean) => {
  const candidates = isNative
    ? [backendBase ? `${backendBase}/api/news/${contId}` : ""].filter(Boolean)
    : ["/api/news/" + contId, backendBase ? `${backendBase}/api/news/${contId}` : "", "http://localhost:3000/api/news/" + contId].filter(Boolean);

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      const res = await request<any>(url, { method: "GET" });
      const normalized = normalizeNewsDetailResponse(res);
      if (normalized) return normalized;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to load news detail from backend.");
};

/** 获取全部节点（分类）原始接口 */
export const getWebAllNodes = async () => {
  const res = await request<{ code: number; data: { nodeList: WebNode[] } }>(`${BASE_URL}/node/getWebAllNodes`, { method: "GET" });
  if (res?.code !== 200 || !Array.isArray(res?.data?.nodeList)) {
    throw new Error("Failed to fetch nodes.");
  }
  return res;
};

/** 获取分类列表（映射为前端 Category，带缓存） */
export const getCategories = async (): Promise<Category[]> => {
  const cached = getCategoriesCache();
  if (cached) return cached;

  const res = await getWebAllNodes();
  const list = res.data.nodeList ?? [];
  const categories = list
    .filter((node) => node.nodeType === 0 && node.name !== "DAILY TONES")
    .map((node) => ({
      id: String(node.nodeId),
      title: node.name,
      description: node.description || "",
      pic: node.pic,
      tonePic: node.tonePic,
    }));
  setCategoriesCache(categories);
  return categories;
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

export const getNewsList = async (nodeId: string, pageNum: number, pageSize: number = 20) => {
  const res = await request<NewsListResponse>(`${BASE_URL}/cont/nodeCont/getByNodeId`, {
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

export const getNewsDetail = async (contId: string) => {
  const backendBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  const isNative = isNativeRuntime();

  // Native first: direct request to Seventh Tone via CapacitorHttp (OkHttp on Android).
  if (isNative) {
    try {
      return await getNewsDetailFromSixthToneNative(contId);
    } catch (nativeError) {
      if (!backendBase) {
        throw nativeError;
      }
      // fallback to configured backend relay
    }
  }

  return await getNewsDetailFromBackendRelay(contId, backendBase, isNative);
};

// Local storage for history (带阅读时间，用于只显示“今天读过”)
const HISTORY_KEY = "sixthtone_reading_history";

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

/** 仅返回今天（本地日期）阅读过的条目（含阅读时间），供 History 页展示 */
export const getHistoryEntriesToday = (): HistoryEntry[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  return getHistoryRaw().filter((e) => e.readAt >= startOfToday && e.readAt < startOfTomorrow);
};

/** 仅返回今天阅读过的新闻列表（兼容用） */
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

export const addBookmark = (news: NewsItem, category: string) => {
  try {
    const bookmarks = getBookmarks();
    const newBookmark: Bookmark = { news, category, CollectedAt: Date.now() };
    const newBookmarks = [newBookmark, ...bookmarks.filter((b) => b.news.contId !== news.contId)];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
  } catch (e) {
    console.error("Failed to save bookmark", e);
  }
};

export const removeBookmark = (contId: number) => {
  try {
    const bookmarks = getBookmarks();
    const newBookmarks = bookmarks.filter((b) => b.news.contId !== contId);
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

/** 重命名书签分类：将所有 category === oldName 的书签改为 newName */
export const renameBookmarkCategory = (oldName: string, newName: string) => {
  try {
    const bookmarks = getBookmarks();
    const updated = bookmarks.map((b) => (b.category === oldName ? { ...b, category: newName } : b));
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to rename bookmark category", e);
  }
};

/** 删除书签分类：逐一调用 removeBookmark 删除该分类下的所有书签 */
export const deleteBookmarkCategory = (category: string) => {
  try {
    getBookmarks()
      .filter((b) => b.category === category)
      .forEach((b) => removeBookmark(b.news.contId));
  } catch (e) {
    console.error("Failed to delete bookmark category", e);
  }
};

// Local storage for sentences
const HIGHLIGHTS_KEY = "sixthtone_sentences";

export const getSentences = (contId: number): Sentence[] => {
  try {
    const allSentences = localStorage.getItem(HIGHLIGHTS_KEY);
    const parsed = allSentences ? JSON.parse(allSentences) : {};
    return parsed[contId] || [];
  } catch (e) {
    console.error("Failed to parse sentences", e);
    return [];
  }
};

export const getAllSentences = (): Sentence[] => {
  try {
    const allSentencesStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allSentences = allSentencesStr ? JSON.parse(allSentencesStr) : {};
    const result: Sentence[] = [];
    for (const contId of Object.keys(allSentences)) {
      result.push(...allSentences[contId]);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Failed to parse sentences", e);
    return [];
  }
};

export const addSentence = (
  contId: number,
  text: string,
  newsName?: string,
  start?: number,
  length?: number,
  category?: string,
  thought?: string,
) => {
  try {
    const normalizedText = formatQuoteText(text);
    const allSentencesStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allSentences = allSentencesStr ? JSON.parse(allSentencesStr) : {};
    const newsSentences: Sentence[] = allSentences[contId] || [];

    const hasSameRange =
      typeof start === "number" && typeof length === "number" && newsSentences.some((h) => h.start === start && h.length === length);
    if (hasSameRange) return;

    const newSentence: Sentence = {
      id: Math.random().toString(36).substring(2, 9),
      contId,
      text: normalizedText,
      newsName,
      category: category || "Sentences",
      thought: thought?.trim() || undefined,
      start,
      length,
      createdAt: Date.now(),
    };

    allSentences[contId] = [...newsSentences, newSentence];
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allSentences));
  } catch (e) {
    console.error("Failed to save sentence", e);
  }
};

/** 高亮用到的全部分类（书签分类 + 已有高亮分类，去重） */
export const getSentenceCategories = (): string[] => {
  const cats = new Set<string>();
  getAllSentences().forEach((h) => {
    // 空/未设置的 category 归入 "Sentences" 默认分类
    cats.add(h.category || "Sentences");
  });
  return Array.from(cats);
};

/** 重命名高亮分类：将所有 category === oldName 的高亮改为 newName */
export const renameSentenceCategory = (oldName: string, newName: string) => {
  try {
    const allStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const all = allStr ? JSON.parse(allStr) : {};
    for (const contId of Object.keys(all)) {
      all[contId] = (all[contId] as Sentence[]).map((h) => ((h.category || "Sentences") === oldName ? { ...h, category: newName } : h));
    }
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to rename sentence category", e);
  }
};

/** 删除高亮分类：逐一调用 removeSentence 删除该分类下的所有高亮 */
export const deleteSentenceCategory = (category: string) => {
  try {
    getAllSentences()
      .filter((h) => (h.category || "Sentences") === category)
      .forEach((h) => removeSentence(h.contId, h.id));
  } catch (e) {
    console.error("Failed to delete sentence category", e);
  }
};

export const removeSentence = (contId: number, highlightId: string) => {
  try {
    const allSentencesStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allSentences = allSentencesStr ? JSON.parse(allSentencesStr) : {};
    if (allSentences[contId]) {
      allSentences[contId] = allSentences[contId].filter((h: Sentence) => h.id !== highlightId);
      localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allSentences));
    }
  } catch (e) {
    console.error("Failed to remove sentence", e);
  }
};

// ── 生词本 ──────────────────────────────────────────────────────────────
const VOCAB_KEY = "sixthtone_vocabulary";

export const getVocab = (): VocabWord[] => {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isInVocab = (word: string): boolean => getVocab().some((v) => v.word.toLowerCase() === word.toLowerCase());

export const addVocab = (word: string, phonetic?: string, translations: string[] = []) => {
  try {
    const vocab = getVocab();
    if (vocab.some((v) => v.word.toLowerCase() === word.toLowerCase())) return;
    const newWord: VocabWord = {
      id: Math.random().toString(36).substring(2, 9),
      word,
      phonetic,
      translations,
      addedAt: Date.now(),
    };
    localStorage.setItem(VOCAB_KEY, JSON.stringify([newWord, ...vocab]));
  } catch {
    console.error("Failed to save vocab word");
  }
};

export const removeVocab = (id: string) => {
  try {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(getVocab().filter((v) => v.id !== id)));
  } catch {
    console.error("Failed to remove vocab word");
  }
};
// ────────────────────────────────────────────────────────────────────────

export const updateSentence = (contId: number, highlightId: string, updates: { thought?: string; category?: string }) => {
  try {
    const allSentencesStr = localStorage.getItem(HIGHLIGHTS_KEY);
    const allSentences = allSentencesStr ? JSON.parse(allSentencesStr) : {};
    if (allSentences[contId]) {
      allSentences[contId] = (allSentences[contId] as Sentence[]).map((h) =>
        h.id === highlightId
          ? {
              ...h,
              ...(updates.category !== undefined ? { category: updates.category } : {}),
              thought: updates.thought?.trim() || undefined,
            }
          : h,
      );
      localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(allSentences));
    }
  } catch (e) {
    console.error("Failed to update sentence", e);
  }
};
