export type PointsActivityType = "news_read" | "practice_answer" | "practice_complete";

export interface PointsTransaction {
  id: string;
  type: PointsActivityType;
  points: number;
  title: string;
  description: string;
  createdAt: number;
  articleId?: number;
  articleTitle?: string;
  questionId?: string;
  referenceKey: string;
}

interface PointsStore {
  version: 1;
  totalPoints: number;
  transactions: PointsTransaction[];
  grants: Record<string, number>;
}

export interface PointsSummary {
  totalPoints: number;
  totalEarned: number;
  transactionCount: number;
  lastEarnedAt: number | null;
}

export interface PointsAwardResult {
  granted: boolean;
  points: number;
  totalPoints: number;
  transaction?: PointsTransaction;
  reason?: "duplicate" | "too_short" | "incomplete";
}

const POINTS_STORAGE_KEY = "seventh-tone-points-ledger";
const MAX_TRANSACTIONS = 500;
const NEWS_READ_REWARD_POINTS = 5;
const NEWS_READ_MIN_DURATION_MS = 15000;
const PRACTICE_CORRECT_POINTS = 2;
const PRACTICE_ATTEMPT_POINTS = 1;
const PRACTICE_SUBJECTIVE_POINTS = 2;
const PRACTICE_COMPLETE_POINTS = 5;

function getDefaultStore(): PointsStore {
  return {
    version: 1,
    totalPoints: 0,
    transactions: [],
    grants: {},
  };
}

function getPointsStore(): PointsStore {
  try {
    const raw = localStorage.getItem(POINTS_STORAGE_KEY);
    if (!raw) return getDefaultStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return getDefaultStore();

    const totalPoints = typeof parsed.totalPoints === "number" && Number.isFinite(parsed.totalPoints) ? parsed.totalPoints : 0;
    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions.filter(
          (item): item is PointsTransaction =>
            !!item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.type === "string" &&
            typeof item.points === "number" &&
            typeof item.title === "string" &&
            typeof item.description === "string" &&
            typeof item.createdAt === "number" &&
            typeof item.referenceKey === "string",
        )
      : [];
    const grants = parsed.grants && typeof parsed.grants === "object" && !Array.isArray(parsed.grants) ? parsed.grants : {};

    return {
      version: 1,
      totalPoints,
      transactions: transactions.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_TRANSACTIONS),
      grants: Object.fromEntries(
        Object.entries(grants).filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number"),
      ),
    };
  } catch {
    return getDefaultStore();
  }
}

function savePointsStore(store: PointsStore) {
  localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(store));
}

function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function grantPoints(input: Omit<PointsTransaction, "id" | "createdAt">): PointsAwardResult {
  const store = getPointsStore();
  if (store.grants[input.referenceKey]) {
    return {
      granted: false,
      points: 0,
      totalPoints: store.totalPoints,
      reason: "duplicate",
    };
  }

  const transaction: PointsTransaction = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  const nextStore: PointsStore = {
    version: 1,
    totalPoints: store.totalPoints + input.points,
    transactions: [transaction, ...store.transactions].slice(0, MAX_TRANSACTIONS),
    grants: {
      ...store.grants,
      [input.referenceKey]: transaction.createdAt,
    },
  };

  savePointsStore(nextStore);

  return {
    granted: true,
    points: input.points,
    totalPoints: nextStore.totalPoints,
    transaction,
  };
}

export function getPointsTransactions(): PointsTransaction[] {
  return getPointsStore().transactions;
}

export function getPointsSummary(): PointsSummary {
  const store = getPointsStore();
  return {
    totalPoints: store.totalPoints,
    totalEarned: store.transactions.reduce((sum, item) => sum + item.points, 0),
    transactionCount: store.transactions.length,
    lastEarnedAt: store.transactions[0]?.createdAt ?? null,
  };
}

export function awardNewsReadingPoints(articleId: number, articleTitle: string, durationMs: number): PointsAwardResult {
  const safeDuration = Math.round(durationMs);
  if (!Number.isFinite(safeDuration) || safeDuration < NEWS_READ_MIN_DURATION_MS) {
    return {
      granted: false,
      points: 0,
      totalPoints: getPointsSummary().totalPoints,
      reason: "too_short",
    };
  }

  return grantPoints({
    type: "news_read",
    points: NEWS_READ_REWARD_POINTS,
    title: "News read",
    description: `Completed a focused reading session for “${articleTitle}”.`,
    articleId,
    articleTitle,
    referenceKey: `news-read:${articleId}:${toLocalDayKey(Date.now())}`,
  });
}

export function awardPracticeAnswerPoints(params: {
  articleId: number;
  articleTitle: string;
  questionId: string;
  sectionTitle: string;
  isCorrect?: boolean;
  isSubjective?: boolean;
}): PointsAwardResult {
  const { articleId, articleTitle, questionId, sectionTitle, isCorrect = false, isSubjective = false } = params;
  const points = isSubjective ? PRACTICE_SUBJECTIVE_POINTS : isCorrect ? PRACTICE_CORRECT_POINTS : PRACTICE_ATTEMPT_POINTS;

  return grantPoints({
    type: "practice_answer",
    points,
    title: isSubjective ? `${sectionTitle} submitted` : `${sectionTitle} answered`,
    description: isSubjective
      ? `Submitted a response in ${sectionTitle}.`
      : isCorrect
        ? `Answered correctly in ${sectionTitle}.`
        : `Completed an attempt in ${sectionTitle}.`,
    articleId,
    articleTitle,
    questionId,
    referenceKey: `practice-answer:${articleId}:${questionId}`,
  });
}

export function awardPracticeCompletionPoints(params: {
  articleId: number;
  articleTitle: string;
  totalQuestions: number;
  answeredQuestions: number;
}): PointsAwardResult {
  const { articleId, articleTitle, totalQuestions, answeredQuestions } = params;
  if (totalQuestions === 0 || answeredQuestions < totalQuestions) {
    return {
      granted: false,
      points: 0,
      totalPoints: getPointsSummary().totalPoints,
      reason: "incomplete",
    };
  }

  return grantPoints({
    type: "practice_complete",
    points: PRACTICE_COMPLETE_POINTS,
    title: "Practice completed",
    description: `Completed the full practice set for “${articleTitle}”.`,
    articleId,
    articleTitle,
    referenceKey: `practice-complete:${articleId}`,
  });
}
