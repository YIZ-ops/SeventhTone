import type { Category } from "../types";

const CATEGORIES_CACHE_KEY = "sixthtone_categories_cache";
let memoryCache: Category[] | null = null;

function isCategoryArray(value: unknown): value is Category[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "id" in item && "title" in item);
}

export function getCategoriesCache(): Category[] | null {
  if (memoryCache && memoryCache.length > 0) return memoryCache;

  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isCategoryArray(parsed) || parsed.length === 0) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function setCategoriesCache(categories: Category[]): void {
  memoryCache = categories;
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {
    // ignore write failures
  }
}
