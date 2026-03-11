import React, { useRef, useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { useBottomToast } from "../utils/toast";
import { APP_FONT_SANS, APP_FONT_SERIF } from "../utils/typography";
import DOMPurify from "dompurify";

const SHARE_FONT = APP_FONT_SANS;
const SHARE_TITLE_FONT = APP_FONT_SERIF;

// html2canvas 兼容样式 - 使用 px 单位，避免不支持的 CSS 属性
const CARD_CONTAINER_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  fontFamily: SHARE_FONT,
  color: "#0f172a",
  borderRadius: "32px",
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  width: "720px",
};

const CARD_CONTENT_STYLE: React.CSSProperties = {
  padding: "32px 40px 36px",
};

const BADGE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 14px",
  borderRadius: "999px",
  backgroundColor: "rgba(16, 185, 129, 0.1)",
  color: "#047857",
  fontFamily: SHARE_FONT,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const BADGE_DOT_STYLE: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  backgroundColor: "#10b981",
};

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: SHARE_TITLE_FONT,
  fontSize: "42px",
  lineHeight: "50px",
  fontWeight: 700,
  margin: "20px 0 16px",
  letterSpacing: "0px",
  color: "#0f172a",
};

const META_STYLE: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  color: "#475569",
  fontFamily: SHARE_FONT,
  fontSize: "18px",
  lineHeight: "28px",
  marginBottom: "20px",
};

const SUMMARY_STYLE: React.CSSProperties = {
  fontFamily: SHARE_TITLE_FONT,
  fontSize: "24px",
  lineHeight: "41px",
  color: "#334155",
  margin: 0,
  fontStyle: "normal",
  fontWeight: 400,
};

const CONTENT_BOX_STYLE: React.CSSProperties = {
  marginTop: "28px",
  padding: "24px 26px",
  borderRadius: "24px",
  backgroundColor: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};


/**
 * 为分享卡片清理 HTML 内容
 * 使用 px 单位并显式声明字体，确保 html2canvas 渲染一致
 */
function buildShareContentHtml(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // 移除非文本元素
  temp
    .querySelectorAll("img, figure, figcaption, video, audio, iframe, table, script, style, noscript, svg, picture, source")
    .forEach((n) => n.remove());

  // 清除所有 class 和 style，防止 Tailwind/暗黑模式样式泄漏
  temp.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("class");
    el.removeAttribute("style");
  });

  // 使用 px 单位的块级元素样式
  const font = `font-family:${SHARE_FONT};`;
  const pStyle = `font-family:${SHARE_TITLE_FONT};font-size:22px;line-height:39px;color:#1e293b;margin:18px 0 0;letter-spacing:0px;font-weight:400;`;
  temp.querySelectorAll("p").forEach((el) => el.setAttribute("style", pStyle));
  temp
    .querySelectorAll("h2")
    .forEach((el) =>
      el.setAttribute(
        "style",
        `font-family:${SHARE_TITLE_FONT};font-size:28px;line-height:40px;font-weight:700;color:#1e293b;margin:18px 0 0;letter-spacing:0px;`,
      ),
    );
  temp
    .querySelectorAll("h3, h4")
    .forEach((el) =>
      el.setAttribute(
        "style",
        `font-family:${SHARE_TITLE_FONT};font-size:24px;line-height:35px;font-weight:700;color:#1e293b;margin:18px 0 0;letter-spacing:0px;`,
      ),
    );
  temp
    .querySelectorAll("blockquote")
    .forEach((el) =>
      el.setAttribute(
        "style",
        `font-family:${SHARE_TITLE_FONT};font-size:22px;line-height:39px;color:#334155;margin:18px 0 0;padding-left:18px;border-left:4px solid rgba(16,185,129,0.28);font-style:italic;`,
      ),
    );
  temp.querySelectorAll("ul, ol").forEach((el) => el.setAttribute("style", `${font}margin:18px 0 0;padding-left:24px;`));
  temp
    .querySelectorAll("li")
    .forEach((el) => el.setAttribute("style", `font-family:${SHARE_TITLE_FONT};font-size:22px;line-height:39px;color:#1e293b;`));

  // 内联元素 - 不指定 font-family，继承父元素字体
  temp.querySelectorAll("a").forEach((el) => el.setAttribute("style", `color:#059669;text-decoration:none;`));
  temp.querySelectorAll("strong, b").forEach((el) => el.setAttribute("style", `font-weight:700;`));
  temp.querySelectorAll("em, i").forEach((el) => el.setAttribute("style", `font-style:italic;`));
  temp.querySelectorAll("span").forEach((el) => el.removeAttribute("style"));

  // 首个可见块元素的 margin 置零
  const first = temp.querySelector("p, h2, h3, h4, blockquote, ul, ol");
  if (first) {
    const s = first.getAttribute("style") || "";
    first.setAttribute("style", s.replace(/margin:\s*18px 0 0/, "margin:0"));
  }

  return temp.innerHTML;
}

interface ShareCardModalProps {
  news: {
    contId: number;
    name: string;
    summary: string;
    pubTime: string;
    content: string;
    authorList?: Array<{ name: string; pic?: string }>;
  };
  onClose: () => void;
}

export default function ShareCardModal({ news, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(true); // 默认开始生成
  const [saved, setSaved] = useState(false);
  const { showToast } = useBottomToast();

  const authorLabel = news.authorList?.map((a) => a.name).join(", ") || "Seventh Tone";

  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(news.content, { ADD_ATTR: ["target"] });
  }, [news.content]);

  const shareContentHtml = useMemo(() => {
    if (!sanitizedContent) return "";
    return buildShareContentHtml(sanitizedContent);
  }, [sanitizedContent]);

  const waitForLayoutSettled = async () => {
    if (typeof window === "undefined") return;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  };

  const ensureFontsReady = async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    await Promise.all([
      document.fonts.load(`700 42px ${SHARE_TITLE_FONT}`),
      document.fonts.load(`400 24px ${SHARE_TITLE_FONT}`),
      document.fonts.load(`700 18px ${SHARE_FONT}`),
      document.fonts.load(`400 16px ${SHARE_FONT}`),
    ]);
    await document.fonts.ready;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const fileName = `seventh-tone-news-${news.contId}.jpg`;

    setIsGenerating(true);
    setSaved(false);

    try {
      await ensureFontsReady();
      await waitForLayoutSettled();

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f8fafc",
        logging: false,
      });

      if (Capacitor.isNativePlatform()) {
        const base64 = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: news.name,
          text: `${news.name} · ${authorLabel}`,
          files: [result.uri],
          dialogTitle: "Share news image",
        });
      } else {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95));
        if (!blob) throw new Error("Failed to create image blob.");

        const file = new File([blob], fileName, { type: "image/jpeg" });
        if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: news.name,
            text: `${news.name} · ${authorLabel}`,
          });
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = fileName;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
        }
      }

      setSaved(true);
      showToast(Capacitor.isNativePlatform() ? "Shared successfully." : "Download started.", "success");
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 100);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        onClose();
        return;
      }
      console.error("Failed to generate share image", err);
      showToast("Share failed. Please try again.", "error");
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  // 组件挂载后自动触发分享
  useEffect(() => {
    handleDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-popup onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* 隐藏的卡片容器 - 仅用于截图 */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div ref={cardRef} style={CARD_CONTAINER_STYLE}>
          <div style={CARD_CONTENT_STYLE}>
            <div style={BADGE_STYLE}>
              <span style={BADGE_DOT_STYLE} />
              Seventh Tone
            </div>

            <h1 style={TITLE_STYLE}>{news.name}</h1>

            <div style={META_STYLE}>
              <span>{authorLabel}</span>
              <span>•</span>
              <span>{news.pubTime}</span>
            </div>

            <p style={SUMMARY_STYLE}>{news.summary}</p>

            {shareContentHtml && <div style={CONTENT_BOX_STYLE} dangerouslySetInnerHTML={{ __html: shareContentHtml }} />}

          </div>
        </div>
      </div>
    </div>
  );
}
