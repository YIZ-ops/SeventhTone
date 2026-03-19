import DOMPurify from "dompurify";
import Mark from "mark.js";
import { NewsDetail, Sentence, TextImageListType } from "../types";

interface NormalizedTextMap {
  normalized: string;
  normalizedToRaw: number[];
}

interface TextRange {
  start: number;
  length: number;
  end: number;
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
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

export function findTextRange(rawText: string, needle: string, occupiedRanges: Array<{ start: number; end: number }>): TextRange | null {
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

export function buildAtlasCarouselHtml(items: TextImageListType[], title: string) {
  if (!items.length) return "";

  const slidesHtml = items
    .map((item, index) => {
      const desc = item.desc || "";
      const alt = escapeHtml(desc || `${title} image ${index + 1}`);
      const src = escapeHtml(item.url);
      const widthAttr = item.width ? ` width="${item.width}"` : "";
      const heightAttr = item.height ? ` height="${item.height}"` : "";

      return `<div class="snap-start min-w-full" data-atlas-slide="${index}">
        <img src="${src}" alt="${alt}" class="block h-auto w-full" loading="lazy" referrerpolicy="no-referrer"${widthAttr}${heightAttr} />
        <div class="mt-3 flex items-start justify-between gap-3 px-1">
          <figcaption class="flex-1 text-xs leading-[1.6] text-center text-gray-500 dark:text-gray-400">${escapeHtml(desc)}</figcaption>
          <span class="shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500">${index + 1} / ${items.length}</span>
        </div>
      </div>`;
    })
    .join("");

  return `<figure class="news-atlas not-prose my-6" data-atlas-root>
    <div class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-xl bg-gray-50 dark:bg-slate-800/60" data-atlas-slider>
      ${slidesHtml}
    </div>
  </figure>`;
}

export function decorateNewsContent(news: Pick<NewsDetail, "content" | "textImageList" | "atlasList" | "name">): string {
  if (!news.content) return "";

  const sanitized = DOMPurify.sanitize(news.content, {
    ADD_ATTR: ["target", "data-index"],
    ALLOW_DATA_ATTR: true,
  });
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitized;

  const imageList = Array.isArray(news.textImageList) ? news.textImageList : [];
  const atlasList = Array.isArray(news.atlasList) ? news.atlasList : [];
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

  tmp.querySelectorAll(".atlasWrap").forEach((wrap) => {
    const indexAttr = wrap.getAttribute("data-index");
    const index = indexAttr ? Number(indexAttr) : NaN;
    const atlasItems = Number.isFinite(index) ? atlasList[index] : undefined;

    if (!Array.isArray(atlasItems) || atlasItems.length === 0) {
      wrap.remove();
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = buildAtlasCarouselHtml(atlasItems, news.name || "illustration");
    const atlasFigure = container.firstElementChild;
    if (!atlasFigure) {
      wrap.remove();
      return;
    }

    wrap.replaceWith(atlasFigure);
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
