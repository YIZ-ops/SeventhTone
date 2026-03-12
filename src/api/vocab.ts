import type { VocabWord } from "../types";

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
