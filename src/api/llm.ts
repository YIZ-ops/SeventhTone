/**
 * LLM integration — SiliconFlow API (OpenAI-compatible).
 * Developer: change ACTIVE_MODEL below to switch models.
 */

// ─── Model registry ──────────────────────────────────────────────────────────
export const LLM_MODELS = {
  "Qwen2.5-7B": "Qwen/Qwen2.5-7B-Instruct",   // fast & cheap — default
  "Qwen2.5-72B": "Qwen/Qwen2.5-72B-Instruct",  // higher quality
  "DeepSeek-V2.5": "deepseek-ai/DeepSeek-V2.5",
  "GLM-4-9B": "THUDM/glm-4-9b-chat",
} as const;

type LLMModelKey = keyof typeof LLM_MODELS;

/** ← Change this single line to switch models */
const ACTIVE_MODEL: LLMModelKey = "Qwen2.5-7B";

export const LLM_CONFIG = {
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: "sk-kkvbnpzoblxglnnxdeokaupyxbxclqwbvtfitzxwvdeifetg",
  model: LLM_MODELS[ACTIVE_MODEL],
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VocabQuestion {
  id: string;
  word: string;
  sentence: string;   // with "___" as blank
  answer: string;
  options: string[];  // 4 shuffled choices
  explanation: string;
}

export interface ComprehensionQuestion {
  id: string;
  question: string;
  options: string[];  // 4 choices
  answer: number;     // 0-based correct index
  explanation: string;
}

/** A sentence-level translation exercise */
export interface TranslationQuestion {
  id: string;
  sourceText: string;  // English (en2cn) or Chinese (cn2en)
  modelAnswer: string; // Chinese (en2cn) or English (cn2en)
}

export interface TranslationEval {
  id: string;
  score: number;    // 0-100
  feedback: string;
  improved: string;
}

export interface ExerciseSet {
  vocabulary: VocabQuestion[];           // 3 items
  comprehension: ComprehensionQuestion[]; // 3 items
  en2cn: TranslationQuestion[];          // 2 items — English source
  cn2en: TranslationQuestion[];          // 2 items — Chinese source
  modelSummary: string;
}

export interface SummaryEvaluation {
  score: number;      // 0-100
  grammar: string;
  content: string;
  vocabulary: string;
  improved: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip HTML and truncate to stay within token budget */
export function prepareArticleText(html: string, maxChars = 2000): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxChars);
}

async function chatCompletion(
  messages: { role: "user" | "system"; content: string }[],
  jsonMode = false,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: LLM_CONFIG.model,
    messages,
    temperature: 0.35,
    max_tokens: 1800,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${LLM_CONFIG.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * One API call — generates all 4 exercise types at once.
 * Token cost: ~1,200 input + ~800 output ≈ 2,000 tokens total.
 */
export async function generateExercises(
  title: string,
  plainText: string,
): Promise<ExerciseSet> {
  // Compact inline-JSON example to guide the model with minimal tokens
  const prompt = `English learning assistant. Generate exercises for this article. ONLY valid JSON, no markdown.

Title: ${title}
Article: ${plainText}

Return this exact structure:
{"vocabulary":[{"id":"v1","word":"W","sentence":"Sentence with ___ blank","answer":"W","options":["W","x","y","z"],"explanation":"meaning in context"},{"id":"v2",...},{"id":"v3",...}],"comprehension":[{"id":"c1","question":"?","options":["A","B","C","D"],"answer":0,"explanation":"why"},{"id":"c2",...},{"id":"c3",...}],"en2cn":[{"id":"e1","sourceText":"English sentence from article","modelAnswer":"中文翻译"},{"id":"e2",...}],"cn2en":[{"id":"d1","sourceText":"用中文描述文章中的一个核心概念","modelAnswer":"English expression"},{"id":"d2",...}],"modelSummary":"2-3 sentence summary"}

Rules:
- vocabulary: exactly 3 items; sentence and ALL options MUST be in English; shuffle options so answer is NOT always first; explanation in Chinese (简体中文)
- comprehension: exactly 3 items covering main idea, a key fact, author tone; question and ALL options MUST be in English; explanation in Chinese (简体中文)
- en2cn: exactly 2 complete English sentences from article; modelAnswer is Chinese
- cn2en: exactly 2 Chinese descriptions of article concepts; modelAnswer is English
- ALL question/sentence/option text MUST be in English; only explanation fields in Chinese`;

  const raw = await chatCompletion([{ role: "user", content: prompt }], true);

  type Raw = {
    vocabulary: Array<{ id: string; word: string; sentence: string; answer: string; options: string[]; explanation: string }>;
    comprehension: Array<{ id: string; question: string; options: string[]; answer: number; explanation: string }>;
    en2cn: Array<{ id: string; sourceText: string; modelAnswer: string }>;
    cn2en: Array<{ id: string; sourceText: string; modelAnswer: string }>;
    modelSummary: string;
  };

  const p = parseJSON<Raw>(raw);
  return {
    vocabulary: (p.vocabulary ?? []).slice(0, 3),
    comprehension: (p.comprehension ?? []).slice(0, 3),
    en2cn: (p.en2cn ?? []).slice(0, 2),
    cn2en: (p.cn2en ?? []).slice(0, 2),
    modelSummary: p.modelSummary ?? "",
  };
}

/**
 * Batch-evaluate all translation answers in one call.
 * Returns scores + feedback for each item.
 */
export async function evaluateTranslations(
  items: Array<{
    id: string;
    direction: "en2cn" | "cn2en";
    source: string;
    userAnswer: string;
    modelAnswer: string;
  }>,
): Promise<TranslationEval[]> {
  const list = items
    .map(
      (item, i) =>
        `${i + 1}. [${item.direction === "en2cn" ? "EN→CN" : "CN→EN"}] id=${item.id}\nSource: ${item.source}\nStudent: ${item.userAnswer.trim() || "(no answer)"}\nReference: ${item.modelAnswer}`,
    )
    .join("\n\n");

  const prompt = `Evaluate these translation attempts. ONLY valid JSON, no markdown.

${list}

{"results":[{"id":"...","score":0,"feedback":"用一句简体中文给出建设性点评","improved":"改进后的译文（EN→CN 的 improved 为中文；CN→EN 的 improved 为英文）"}]}

Score 0-100 per item. Score 0 for empty or nonsensical answers. Be strict but encouraging.
IMPORTANT:
- feedback MUST always be in Chinese (简体中文)
- improved: for EN→CN items write improved Chinese translation; for CN→EN items write improved English translation`;

  const raw = await chatCompletion([{ role: "user", content: prompt }], true);
  const p = parseJSON<{ results: TranslationEval[] }>(raw);
  return p.results ?? [];
}

/**
 * Evaluate a user-written summary.
 * Third call — only triggered when user explicitly submits their summary.
 * Bug fix: example score removed from prompt to prevent bias.
 */
export async function evaluateSummary(
  articleText: string,
  userSummary: string,
): Promise<SummaryEvaluation> {
  const trimmed = userSummary.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  // Hard-code score 0 for empty/too-short summaries — no API call needed
  if (wordCount < 8) {
    return {
      score: 0,
      grammar: "概要太短，无法评估语法。",
      content: "请至少用 3 句完整英文句子概括文章主要内容。",
      vocabulary: "内容过少，暂无词汇反馈。",
      improved: "",
    };
  }

  const prompt = `Evaluate this English article summary objectively. ONLY valid JSON, no markdown.
The summary must be in English. Non-English text → score 0.
IMPORTANT: grammar, content, vocabulary, improved fields MUST be written in Chinese (简体中文).

Article excerpt (first 600 chars): ${articleText.slice(0, 600)}

Student's English summary: "${trimmed}"

{"score":REPLACE_WITH_0_TO_100,"grammar":"用中文点评语法和句子结构","content":"用中文点评信息准确性和完整性","vocabulary":"用中文点评词汇使用","improved":"an improved English version of the student's summary"}

Scoring criteria (strict):
- 0-20: major errors or missing main point
- 21-50: partial coverage, notable grammar issues
- 51-75: adequate summary, minor issues
- 76-90: good summary, well-written
- 91-100: excellent, accurate, fluent
Replace REPLACE_WITH_0_TO_100 with the actual integer score only.
IMPORTANT: grammar/content/vocabulary MUST be in Chinese (简体中文); improved MUST be in English.`;

  const raw = await chatCompletion([{ role: "user", content: prompt }], true);
  return parseJSON<SummaryEvaluation>(raw);
}
