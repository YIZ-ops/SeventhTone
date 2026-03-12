import type { Bookmark, NewsItem } from "../types";

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
