import type { Sentence } from "../types";
import { formatQuoteText } from "../utils/quoteText";

// Local storage for sentences
const HIGHLIGHTS_KEY = "seventhtone_sentences";

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

export const getSentenceCategories = (): string[] => {
  const cats = new Set<string>();
  getAllSentences().forEach((h) => {
    cats.add(h.category || "Sentences");
  });
  return Array.from(cats);
};

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
