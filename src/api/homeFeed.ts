import { request } from "../utils/request";
import type { HomeFeedArticle, HomeFeedRemoteSection, HomeFeedResponse, HomeFeedSection } from "../types";
import { getHomeFeedCache, setHomeFeedCache } from "../store/homeFeedCache";
import { DEFAULT_BUILD_ID, fetchSixthToneHomeFeedByBuildId, isNativeRuntime, resolveLatestBuildIdFromHomeHtml } from "./base";

const toStringValue = (value: unknown) => (typeof value === "string" ? value : "");
const toNumberValue = (value: unknown) => (typeof value === "number" ? value : 0);
const FILTERED_SECTION_NAMES = new Set(["DAILY TONES"]);
const FILTERED_NODE_NAMES = new Set(["DAILYTONE", "SPECIAL PROJECTS"]);
const MOST_READ_SECTION_NAME = "MOST READ";
const MOST_READ_CARD_MODE = "5";

export const extractHomeFeedSections = (payload: HomeFeedResponse): HomeFeedRemoteSection[] => {
  return payload.pageProps?.data?.pageInfo?.list ?? [];
};

export const isFilterSection = (section: HomeFeedRemoteSection) => {
  return FILTERED_SECTION_NAMES.has(toStringValue(section.name)) || FILTERED_NODE_NAMES.has(toStringValue(section.nodeInfo?.name));
};

const isMostReadSection = (section: HomeFeedRemoteSection) => {
  return toStringValue(section.cardMode) === MOST_READ_CARD_MODE && toStringValue(section.name) === MOST_READ_SECTION_NAME;
};

export const normalizeHomeFeedArticle = (item: Record<string, unknown>): HomeFeedArticle => {
  const rawNodeInfo = typeof item.nodeInfo === "object" && item.nodeInfo ? (item.nodeInfo as { nodeId?: number; name?: string }) : undefined;
  const nodeInfo = rawNodeInfo?.name
    ? {
        nodeId: rawNodeInfo.nodeId,
        name: rawNodeInfo.name,
      }
    : undefined;
  const userInfo =
    typeof item.userInfo === "object" && item.userInfo
      ? (item.userInfo as {
          name: string;
          pic: string;
        })
      : undefined;

  return {
    contId: toNumberValue(item.contId),
    nodeId: toNumberValue(item.nodeId),
    name: toStringValue(item.name),
    summary: toStringValue(item.summary),
    pubTime: toStringValue(item.pubTime),
    pubTimeLong: toNumberValue(item.pubTimeLong),
    pic: toStringValue(item.pic),
    appHeadPic: toStringValue(item.appHeadPic),
    link: toStringValue(item.link),
    nodeInfo,
    userInfo,
    cardMode: toStringValue(item.cardMode),
    forwardType: toNumberValue(item.forwardType),
    contType: toNumberValue(item.contType),
  };
};

const resolveHomeFeedGroupName = (item: HomeFeedArticle, section: HomeFeedRemoteSection) => {
  return toStringValue(item.nodeInfo?.name) || toStringValue(section.nodeInfo?.name) || toStringValue(section.name);
};

const isFilteredHomeFeedItem = (item: HomeFeedArticle, section: HomeFeedRemoteSection) => {
  return isFilterSection(section) || FILTERED_NODE_NAMES.has(resolveHomeFeedGroupName(item, section));
};

const flattenDisplayableHomeFeedItems = (sections: HomeFeedRemoteSection[]) => {
  return sections.flatMap((section) => {
    if (isMostReadSection(section)) return [];

    const items = Array.isArray(section.childList) ? section.childList.map((item) => normalizeHomeFeedArticle(item)) : [];
    return items
      .map((item, index) => ({
        item,
        index,
        section,
        groupName: resolveHomeFeedGroupName(item, section),
      }))
      .filter(({ item, section, groupName }) => item.contId > 0 && groupName && !isFilteredHomeFeedItem(item, section));
  });
};

const normalizeMostReadSection = (sections: HomeFeedRemoteSection[]): HomeFeedSection | null => {
  const remoteSection = sections.find((section) => isMostReadSection(section));
  if (!remoteSection || !Array.isArray(remoteSection.childList)) return null;

  const items = remoteSection.childList.map((item) => normalizeHomeFeedArticle(item)).filter((item) => item.contId > 0);
  if (items.length === 0) return null;

  return {
    title: MOST_READ_SECTION_NAME,
    layout: "list",
    cardMode: MOST_READ_CARD_MODE,
    items,
    nodeInfo: remoteSection.nodeInfo,
  };
};

export const normalizeHomeFeedResponse = (payload: HomeFeedResponse): HomeFeedSection[] => {
  const remoteSections = extractHomeFeedSections(payload);
  const mostReadSection = normalizeMostReadSection(remoteSections);
  const flattenedItems = flattenDisplayableHomeFeedItems(remoteSections);
  const heroEntry = flattenedItems.find(({ section, index }) => toStringValue(section.cardMode) === "1" && index === 0);
  const groupedSections = new Map<string, HomeFeedSection>();

  for (const entry of flattenedItems) {
    if (heroEntry && entry.item.contId === heroEntry.item.contId) continue;

    const existingSection = groupedSections.get(entry.groupName);
    if (existingSection) {
      existingSection.items.push(entry.item);
      continue;
    }

    groupedSections.set(entry.groupName, {
      title: entry.groupName,
      layout: "list",
      cardMode: entry.item.cardMode || toStringValue(entry.section.cardMode),
      items: [entry.item],
      nodeInfo: entry.item.nodeInfo ?? entry.section.nodeInfo,
    });
  }

  return [
    ...(mostReadSection ? [mostReadSection] : []),
    ...(heroEntry
      ? [
          {
            title: heroEntry.groupName,
            layout: "hero" as const,
            cardMode: "1",
            items: [heroEntry.item],
            nodeInfo: heroEntry.item.nodeInfo ?? heroEntry.section.nodeInfo,
          },
        ]
      : []),
    ...groupedSections.values(),
  ];
};

const getHomeFeedFromSixthToneNative = async () => {
  try {
    return await fetchSixthToneHomeFeedByBuildId(DEFAULT_BUILD_ID);
  } catch {
    const latestBuildId = await resolveLatestBuildIdFromHomeHtml();
    if (!latestBuildId) {
      throw new Error("Failed to resolve latest buildId from homepage HTML.");
    }
    return await fetchSixthToneHomeFeedByBuildId(latestBuildId);
  }
};

const getHomeFeedFromBackendRelay = async () => {
  const backendBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
  const candidates = ["/api/home-feed", backendBase ? `${backendBase}/api/home-feed` : "", "http://localhost:3000/api/home-feed"].filter(Boolean);

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      return await request<HomeFeedResponse>(url, { method: "GET" });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to load home feed from backend.");
};

export const getHomeFeed = async (forceRefresh = false): Promise<HomeFeedSection[]> => {
  if (!forceRefresh) {
    const cached = getHomeFeedCache();
    if (cached) return cached;
  }

  const payload = isNativeRuntime() ? await getHomeFeedFromSixthToneNative() : await getHomeFeedFromBackendRelay();
  const normalizedSections = normalizeHomeFeedResponse(payload);
  setHomeFeedCache(normalizedSections);
  return normalizedSections;
};
