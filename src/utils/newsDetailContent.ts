import DOMPurify from "dompurify";
import Mark from "mark.js";
import { NewsDetail, Sentence } from "../types";

interface NormalizedTextMap {
  normalized: string;
  normalizedToRaw: number[];
}

interface TextRange {
  start: number;
  length: number;
  end: number;
}

function normalizeTextWithMap(text: string): NormalizedTextMap {
  let normalized = "";
  const normalizedToRaw: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (/\s/.test(char)) {
      continue;
    }

    normalized += char;
    normalizedToRaw.push(index);
  }

  return { normalized, normalizedToRaw };
}

export function findTextRange(
  rawText: string,
  needle: string,
  occupiedRanges: Array<{ start: number; end: number }>,
): TextRange | null {
  const haystack = normalizeTextWithMap(rawText);
  const target = normalizeTextWithMap(needle).normalized;
  if (!target) return null;

  let fromIndex = 0;
  while (fromIndex <= haystack.normalized.length - target.length) {
    const normalizedIndex = haystack.normalized.indexOf(target, fromIndex);
    if (normalizedIndex === -1) return null;

    const rawStart = haystack.normalizedToRaw[normalizedIndex];
    const rawEnd = haystack.normalizedToRaw[normalizedIndex + target.length - 1] + 1;
    const overlaps = occupiedRanges.some((range) => rawStart < range.end && rawEnd > range.start);

    if (!overlaps) {
      return { start: rawStart, length: rawEnd - rawStart, end: rawEnd };
    }

    fromIndex = normalizedIndex + target.length;
  }

  return null;
}

export function decorateNewsContent(news: Pick<NewsDetail, "content" | "textImageList" | "name">): string {
  if (!news.content) return "";

  const sanitized = DOMPurify.sanitize(news.content, {
    ADD_ATTR: ["target", "data-index"],
    ALLOW_DATA_ATTR: true,
  });
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitized;

  const imageList = Array.isArray(news.textImageList) ? news.textImageList : [];
  tmp.querySelectorAll(".illustrationWrap").forEach((wrap) => {
    const indexAttr = wrap.getAttribute("data-index");
    const index = indexAttr ? Number(indexAttr) : NaN;
    const image = Number.isFinite(index) ? imageList[index] : undefined;
    if (!image?.url) {
      wrap.remove();
      return;
    }

    const figure = document.createElement("figure");
    figure.className = "news-illustration";

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = image.desc || news.name || "illustration";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    if (image.width) img.width = image.width;
    if (image.height) img.height = image.height;
    figure.appendChild(img);

    if (image.desc) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = image.desc;
      figure.appendChild(figcaption);
    }

    wrap.replaceWith(figure);
  });

  Array.from(tmp.querySelectorAll("strong")).forEach((strong) => {
    const parent = strong.parentElement;
    if (!parent || parent.tagName !== "P") return;

    const parentText = parent.textContent?.trim() || "";
    const strongText = strong.textContent?.trim() || "";
    if (!parentText || parentText !== strongText) return;

    const heading = document.createElement("h3");
    heading.textContent = strongText;
    heading.className = "news-subtitle";
    parent.replaceWith(heading);
  });

  return tmp.innerHTML;
}

export function highlightSavedSentences(contentHtml: string, sentences: Sentence[]): string {
  if (!contentHtml || !sentences.length) return contentHtml;

  const tmp = document.createElement("div");
  tmp.innerHTML = contentHtml;
  const instance = new Mark(tmp);
  const rawText = tmp.textContent || "";
  const occupiedRanges: Array<{ start: number; end: number }> = [];

  for (const sentence of sentences) {
    const range = findTextRange(rawText, sentence.text, occupiedRanges);
    if (!range) continue;

    occupiedRanges.push({ start: range.start, end: range.end });
    instance.markRanges([range], {
      className: "news-sentence",
      each: (element) => {
        element.setAttribute("data-sentence-id", sentence.id);
      },
    });
  }

  return tmp.innerHTML;
}

export function getWordAtPoint(clientX: number, clientY: number): { word: string; rect: DOMRect } | null {
  const doc = document;
  let range: Range | null = null;
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (doc.caretPositionFromPoint) {
    const pos = (
      doc as Document & { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null }
    ).caretPositionFromPoint(clientX, clientY);
    if (!pos) return null;
    range = doc.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
  }
  if (!range) return null;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent || "";
  const offset = range.startOffset;
  const before = text.slice(0, offset).match(/([a-zA-Z'-]*)$/);
  const after = text.slice(offset).match(/^([a-zA-Z'-]*)/);
  const start = offset - (before ? before[1].length : 0);
  const end = offset + (after ? after[1].length : 0);
  const word = text
    .slice(start, end)
    .replace(/^[-']+|[-']+$/g, "")
    .trim();

  if (!word || word.length < 2) return null;

  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, rect: range.getBoundingClientRect() };
}
