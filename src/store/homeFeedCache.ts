import type { HomeFeedSection } from "../types";
import { createExpiringStorageCache } from "./cache";

const HOME_FEED_CACHE_KEY = "seventhtone_home_feed_cache";
const HOME_FEED_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

function isHomeFeedSectionArray(value: unknown): value is HomeFeedSection[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "title" in item &&
        "layout" in item &&
        "cardMode" in item &&
        "items" in item &&
        Array.isArray((item as { items?: unknown[] }).items),
    )
  );
}

const homeFeedCache = createExpiringStorageCache<HomeFeedSection[]>(
  HOME_FEED_CACHE_KEY,
  HOME_FEED_CACHE_TTL_MS,
  isHomeFeedSectionArray,
);

export function getHomeFeedCache(): HomeFeedSection[] | null {
  return homeFeedCache.get();
}

export function setHomeFeedCache(sections: HomeFeedSection[]): void {
  homeFeedCache.set(sections);
}

export function clearHomeFeedCache(): void {
  homeFeedCache.clear();
}
