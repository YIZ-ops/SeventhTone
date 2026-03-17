import type { Category } from "../types";
import { createExpiringStorageCache } from "./cache";

const CATEGORIES_CACHE_KEY = "seventhtone_categories_cache";
const CATEGORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isCategoryArray(value: unknown): value is Category[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "id" in item && "title" in item);
}

const categoriesCache = createExpiringStorageCache<Category[]>(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_TTL_MS, isCategoryArray);

export function getCategoriesCache(): Category[] | null {
  return categoriesCache.get();
}

export function setCategoriesCache(categories: Category[]): void {
  categoriesCache.set(categories);
}
