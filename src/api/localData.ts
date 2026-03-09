import type { HistoryEntry } from "./api";
import type { NewsItem } from "../types";

const HISTORY_KEY = "sixthtone_reading_history";
const READING_SESSIONS_KEY = "seventh-tone-reading-sessions";

export interface ReadingSession {
  contId: number;
  durationMs: number;
  recordedAt: number;
}

export interface LocalDataExport {
  version: 1;
  exportedAt: string;
  storage: Record<string, string>;
}

export interface ReadingStats {
  todayNewsCount: number;
  totalNewsCount: number;
  todayDurationMs: number;
  totalDurationMs: number;
  readingDays: string[];
  currentStreak: number;
}

function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHistoryRaw(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown) => {
        if (item && typeof item === "object" && "news" in item && "readAt" in item) {
          return item as HistoryEntry;
        }
        return { news: item as NewsItem, readAt: 0 } as HistoryEntry;
      })
      .filter((item) => item?.news?.contId != null)
      .sort((a, b) => b.readAt - a.readAt);
  } catch {
    return [];
  }
}

export function getAllHistoryEntries(): HistoryEntry[] {
  return getHistoryRaw();
}

export function getReadingSessions(): ReadingSession[] {
  try {
    const raw = localStorage.getItem(READING_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ReadingSession => (
        item && typeof item === "object" && typeof item.contId === "number" && typeof item.durationMs === "number" && typeof item.recordedAt === "number"
      ))
      .sort((a, b) => b.recordedAt - a.recordedAt);
  } catch {
    return [];
  }
}

export function addReadingSession(contId: number, durationMs: number) {
  const safeDuration = Math.round(durationMs);
  if (!Number.isFinite(safeDuration) || safeDuration < 3000) return;

  const sessions = getReadingSessions();
  const next: ReadingSession[] = [
    { contId, durationMs: safeDuration, recordedAt: Date.now() },
    ...sessions,
  ].slice(0, 2000);

  localStorage.setItem(READING_SESSIONS_KEY, JSON.stringify(next));
}

export function getReadingStats(): ReadingStats {
  const history = getAllHistoryEntries();
  const sessions = getReadingSessions();
  const todayKey = toLocalDayKey(Date.now());

  const todayNewsIds = new Set(
    history
      .filter((entry) => toLocalDayKey(entry.readAt) === todayKey)
      .map((entry) => entry.news.contId),
  );

  const totalNewsIds = new Set(history.map((entry) => entry.news.contId));
  const readingDays = Array.from(new Set(history.map((entry) => toLocalDayKey(entry.readAt)))).sort();

  const todayDurationMs = sessions
    .filter((session) => toLocalDayKey(session.recordedAt) === todayKey)
    .reduce((sum, session) => sum + session.durationMs, 0);

  const totalDurationMs = sessions.reduce((sum, session) => sum + session.durationMs, 0);

  let currentStreak = 0;
  if (readingDays.includes(todayKey)) {
    const cursor = new Date();
    while (readingDays.includes(toLocalDayKey(cursor.getTime()))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return {
    todayNewsCount: todayNewsIds.size,
    totalNewsCount: totalNewsIds.size,
    todayDurationMs,
    totalDurationMs,
    readingDays,
    currentStreak,
  };
}

export function exportLocalData(): LocalDataExport {
  const storage: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (value != null) storage[key] = value;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    storage,
  };
}

export function importLocalData(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid backup file.");
  }

  const storage = "storage" in payload ? (payload as LocalDataExport).storage : payload;
  if (!storage || typeof storage !== "object" || Array.isArray(storage)) {
    throw new Error("Backup content is not valid local storage data.");
  }

  localStorage.clear();
  for (const [key, value] of Object.entries(storage as Record<string, unknown>)) {
    if (typeof value === "string") {
      localStorage.setItem(key, value);
    }
  }
}
