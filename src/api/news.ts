import { request } from "../utils/request";
import type { NewsListResponse, NewsItem } from "../types";
import {
  BASE_URL,
  DEFAULT_BUILD_ID,
  fetchSixthToneDetailByBuildId,
  isNativeRuntime,
  normalizeNewsDetailResponse,
  resolveLatestBuildIdFromNewsHtml,
} from "./base";

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

export const getNewsListByTopic = async (topicId: string, pageNum: number, pageSize: number = 20) => {
  const res = await request<NewsListResponse>(`${BASE_URL}/cont/topic/getByTopicId`, {
    method: "POST",
    body: JSON.stringify({ topicId, pageNum, pageSize }),
  });

  if (res?.data?.pageInfo?.list) {
    res.data.pageInfo.list = res.data.pageInfo.list.filter((item: any) => {
      return !(item?.name === "MOST READ" && String(item?.cardMode) === "5");
    });
  }

  return res;
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
