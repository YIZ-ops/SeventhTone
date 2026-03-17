export type PracticeEntryType = "vocab" | "comp" | "en2cn" | "cn2en" | "summary";

export type AnswerStatus = "unanswered" | "correct" | "wrong" | "answered";

export interface PracticeSectionMeta {
  label: string;
  short: string;
  accent: string;
  ring: string;
  bg: string;
  badge: string;
}

export interface PracticeSheetSection<TEntry> {
  type: PracticeEntryType;
  entries: Array<{ entry: TEntry; globalIdx: number }>;
}
