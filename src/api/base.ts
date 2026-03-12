import { Capacitor, CapacitorHttp } from "@capacitor/core";

export const BASE_URL = "https://api.sixthtone.com";
export const SIXTH_TONE_WEB_BASE = "https://www.sixthtone.com";
export const DEFAULT_BUILD_ID = "hb8D50A9NRCU31JdhQhE1";
export const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

export const isNativeRuntime = () => {
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  return Capacitor.isNativePlatform() || protocol === "capacitor:" || protocol === "file:";
};

export const normalizeNewsDetailResponse = (res: any) => {
  if (res && res.contId && res.content) {
    return { data: res };
  }
  if (res && res.data) {
    return res;
  }
  return null;
};

export const parseSixthToneDetail = (payload: any) => payload?.pageProps?.detailData;

export const fetchSixthToneDetailByBuildId = async (contId: string, buildId: string) => {
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

export const resolveLatestBuildIdFromNewsHtml = async (contId: string) => {
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
