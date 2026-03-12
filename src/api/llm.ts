/**
 * LLM integration — SiliconFlow API (OpenAI-compatible).
 * Developer: change ACTIVE_MODEL below to switch models.
 */

// ─── Model registry ──────────────────────────────────────────────────────────
export const LLM_MODELS = {
  "Qwen2.5-7B": "Qwen/Qwen2.5-7B-Instruct", // fast & cheap — default
  "Qwen2.5-72B": "Qwen/Qwen2.5-72B-Instruct",
  "DeepSeek-V2.5": "deepseek-ai/DeepSeek-V2.5",
} as const;

type LLMModelKey = keyof typeof LLM_MODELS;

/** ← Change this single line to switch models */
const ACTIVE_MODEL: LLMModelKey = "Qwen2.5-7B";

export const LLM_CONFIG = {
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: import.meta.env.VITE_SILICONFLOW_API_KEY as string | undefined,
  model: LLM_MODELS[ACTIVE_MODEL],
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VocabQuestion {
  id: string;
  word: string;
  sentence: string; // with "___" as blank
  answer: string;
  options: string[]; // 4 shuffled choices
  explanation: string;
}

export interface ComprehensionQuestion {
  id: string;
  question: string;
  options: string[]; // 4 choices
  answer: number; // 0-based correct index
  explanation: string;
}

/** A sentence-level translation exercise */
export interface TranslationQuestion {
  id: string;
  sourceText: string; // English (en2cn) or Chinese (cn2en)
  modelAnswer: string; // Chinese (en2cn) or English (cn2en)
}

export interface TranslationEval {
  id: string;
  score: number; // 0-100
  feedback: string;
  improved: string;
}

export interface ExerciseSet {
  vocabulary: VocabQuestion[]; // 3 items
  comprehension: ComprehensionQuestion[]; // 3 items
  en2cn: TranslationQuestion[]; // 2 items — English source
  cn2en: TranslationQuestion[]; // 2 items — Chinese source
  modelSummary: string;
}

export interface SummaryEvaluation {
  score: number; // 0-100
  grammar: string;
  content: string;
  vocabulary: string;
  improved: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip HTML and truncate to stay within token budget */
export function prepareNewsText(html: string, maxChars = 2000): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, maxChars);
}

async function chatCompletion(messages: { role: "user" | "system"; content: string }[], jsonMode = false): Promise<string> {
  if (!LLM_CONFIG.apiKey) {
    throw new Error("Missing VITE_SILICONFLOW_API_KEY");
  }
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
export async function generateExercises(title: string, plainText: string): Promise<ExerciseSet> {
  // Optimized prompt with structured constraints and explicit schema
  const prompt = `# Role
Expert English Learning Assistant. Generate exercises based on the provided news.

# Input Data
Title: ${title}
News Content: ${plainText}

# Output Requirement
Return ONLY a raw JSON object. NO markdown code blocks (no \`\`\`json), NO introductory text.
The JSON must strictly follow this structure:

{
  "vocabulary": [
    {
      "id": "v1",
      "word": "string (English)",
      "sentence": "string (English sentence with '___' blank for the word)",
      "answer": "string (the correct word)",
      "options": ["string", "string", "string", "string"], 
      "explanation": "string (Chinese)"
    }
  ],
  "comprehension": [
    {
      "id": "c1",
      "question": "string (English)",
      "options": ["string", "string", "string", "string"],
      "answer": 0, 
      "explanation": "string (Chinese)"
    }
  ],
  "en2cn": [
    {
      "id": "e1",
      "sourceText": "string (Complete English sentence from news)",
      "modelAnswer": "string (Chinese translation)"
    }
  ],
  "cn2en": [
    {
      "id": "d1",
      "sourceText": "string (Chinese description of a concept from news)",
      "modelAnswer": "string (English expression)"
    }
  ],
  "modelSummary": "string (2-3 sentences summary in English)"
}

# Strict Rules
1. Counts:
   - vocabulary: Exactly 3 items.
   - comprehension: Exactly 3 items (cover: main idea, key fact, author tone).
   - en2cn: Exactly 2 items.
   - cn2en: Exactly 2 items.

2. Language Constraints:
   - ALL questions, sentences, options, words, and summaries MUST be in English.
   - ONLY "explanation" fields (in vocabulary/comprehension) and "modelAnswer" (in en2cn) MUST be in Simplified Chinese.
   - "sourceText" in cn2en must be Chinese; "modelAnswer" in cn2en must be English.

3. Logic & Formatting:
   - In "vocabulary": Shuffle options so the correct answer is NOT always at index 0. Ensure distractors are plausible.
   - In "comprehension": "answer" must be the index (0-3) of the correct option.
   - Ensure valid JSON syntax (escape quotes if necessary).`;

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
  // Construct a structured data block to prevent prompt injection or confusion
  const inputData = items
    .map(
      (item, i) =>
        `<item index="${i + 1}">\n  <id>${item.id}</id>\n  <direction>${item.direction === "en2cn" ? "EN→CN" : "CN→EN"}</direction>\n  <source>${item.source.replace(/</g, "&lt;")}</source>\n  <student>${(item.userAnswer.trim() || "(no answer)").replace(/</g, "&lt;")}</student>\n  <reference>${item.modelAnswer.replace(/</g, "&lt;")}</reference>\n</item>`,
    )
    .join("\n");

  const prompt = `# Role
Expert Language Evaluator. Evaluate the provided translation attempts.

# Input Data
${inputData}

# Output Format
Return ONLY a raw JSON object. NO markdown code blocks (no \`\`\`), NO introductory text.
Strictly follow this schema:
{
  "results": [
    {
      "id": "string (match input id)",
      "score": 0, 
      "feedback": "string",
      "improved": "string"
    }
  ]
}

# Evaluation Rules
1. Scoring (0-100):
   - 0: Empty, nonsensical, or completely unrelated.
   - 1-50: Major errors, missing key meaning, severe grammar issues.
   - 51-80: Good meaning, minor grammar/vocab issues.
   - 81-100: Excellent, accurate, natural flow.

2. Language Constraints (STRICT):
   - "feedback": MUST be in Simplified Chinese. Provide constructive criticism.
   - "improved": 
     - If direction is EN→CN: Provide the improved translation in Chinese.
     - If direction is CN→EN: Provide the improved translation in English.

3. Content Requirements:
   - Compare student answer against reference.
   - Be strict on accuracy but encouraging in tone.`;

  const raw = await chatCompletion([{ role: "user", content: prompt }], true);
  const p = parseJSON<{ results: TranslationEval[] }>(raw);
  return p.results ?? [];
}

/**
 * Evaluate a user-written summary.
 * Third call — only triggered when user explicitly submits their summary.
 */
export async function evaluateSummary(newsText: string, userSummary: string): Promise<SummaryEvaluation> {
  const trimmed = userSummary.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  // Hard-code score 0 for empty/too-short summaries — no API call needed
  if (wordCount < 8) {
    return {
      score: 0,
      grammar: "概要太短，无法评估语法。",
      content: "请至少用 3 句完整英文句子概括新闻主要内容。",
      vocabulary: "内容过少，暂无词汇反馈。",
      improved: "",
    };
  }

  // Escape potential XML-like tags in text just in case, though less critical here than in list
  const safeNews = newsText.slice(0, 600).replace(/"/g, "'");
  const safeSummary = trimmed.replace(/"/g, "'");

  const prompt = `# Role
Expert English Writing Instructor. Evaluate the student's summary of the provided news.

# Input Data
<News Excerpt>
${safeNews}
</News Excerpt>

<Student Summary>
${safeSummary}
</Student Summary>

# Output Format
Return ONLY a raw JSON object. NO markdown code blocks (no \`\`\`), NO introductory text.
Strictly follow this schema:
{
  "score": 0,
  "grammar": "string",
  "content": "string",
  "vocabulary": "string",
  "improved": "string"
}

# Evaluation Criteria
1. Score (0-100 Integer):
   - 0-20: Major errors, wrong language, or missing main point.
   - 21-50: Partial coverage, notable grammar issues.
   - 51-75: Adequate summary, minor issues.
   - 76-90: Good summary, well-written.
   - 91-100: Excellent, accurate, fluent, concise.
   - IMPORTANT: If summary is not in English, score MUST be 0.

2. Language Constraints (STRICT):
   - "grammar", "content", "vocabulary": MUST be in Simplified Chinese.
   - "improved": MUST be in English (a rewritten, better version of the student's summary).

3. Feedback Focus:
   - Grammar: Sentence structure, tense, news, prepositions.
   - Content: Accuracy of main ideas, completeness, omission of key details.
   - Vocabulary: Appropriateness, variety, precision.`;

  const raw = await chatCompletion([{ role: "user", content: prompt }], true);
  return parseJSON<SummaryEvaluation>(raw);
}
