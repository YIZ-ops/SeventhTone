export interface GroupedItems<T> {
  label: string;
  items: T[];
}

export interface BookmarkCategoryCardData {
  name: string;
  count: number;
  cover?: string;
}

export interface SentenceCategoryCardData {
  name: string;
  count: number;
  preview?: string;
}
