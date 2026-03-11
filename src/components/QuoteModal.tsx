import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { Capacitor } from "@capacitor/core";
import { X, Download, Loader2, Check } from "lucide-react";
import { motion } from "motion/react";
import { saveImageToAlbum } from "../utils/mediaSave";
import { useBottomToast } from "../utils/toast";
import { formatQuoteText } from "../utils/quoteText";
import { APP_FONT_SANS, APP_FONT_SERIF } from "../utils/typography.ts";

const QUOTE_CARD_SANS_FONT = APP_FONT_SANS;
const QUOTE_CARD_SERIF_FONT = APP_FONT_SERIF;

// 卡片固定宽度 - 用于截图
const QUOTE_CARD_WIDTH = 400;
// 预览缩放比例 - 响应式：在较宽屏幕上接近原始大小
const PREVIEW_SCALE = 0.8;

// html2canvas 兼容样式 - 避免使用 box-shadow, filter, backdrop-filter 等不支持的属性
// 所有尺寸使用 px 而非 rem，确保渲染一致性
const QUOTE_CARD_CONTAINER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: QUOTE_CARD_SANS_FONT,
  width: `${QUOTE_CARD_WIDTH}px`,
  minHeight: "420px",
  borderRadius: "20px",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// 顶部装饰渐变条
const QUOTE_CARD_DECORATION_BAND_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)",
  height: "6px",
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
};

// 装饰光晕 - 使用纯色代替 blur
const QUOTE_CARD_DECORATION_GLOW_STYLE: React.CSSProperties = {
  background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%)",
  width: "280px",
  height: "280px",
  top: "-100px",
  right: "-100px",
  position: "absolute",
  borderRadius: "50%",
};

const QUOTE_CARD_CONTENT_STYLE: React.CSSProperties = {
  position: "relative",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  flex: 1,
  padding: "40px 32px 32px",
};

const QUOTE_CARD_BODY_STYLE: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  position: "relative",
  paddingTop: "16px",
  paddingBottom: "24px",
};

// 引用文本样式 - 使用 px 单位，显式声明所有字体属性
// 不限制行数，通过外部滚动容器查看完整内容
const QUOTE_CARD_QUOTE_STYLE: React.CSSProperties = {
  color: "#1f2937",
  fontFamily: QUOTE_CARD_SERIF_FONT,
  fontSize: "17px",
  lineHeight: "28px",
  fontStyle: "italic",
  fontWeight: 400,
  letterSpacing: "0px",
  whiteSpace: "normal",
  overflowWrap: "break-word",
  wordBreak: "break-word",
  position: "relative",
  margin: 0,
  padding: "0 4px",
};

// 引号装饰容器
const QUOTE_MARK_CONTAINER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "-8px",
  left: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

// 优雅的引号样式
const QUOTE_OPEN_MARK_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "-8px",
  left: "-4px",
  fontFamily: "Georgia, serif",
  fontSize: "56px",
  lineHeight: "56px",
  color: "#10b981",
  opacity: 0.15,
  fontWeight: 400,
  fontStyle: "normal",
};

const QUOTE_CLOSE_MARK_STYLE: React.CSSProperties = {
  position: "absolute",
  bottom: "-40px",
  right: "-4px",
  fontFamily: "Georgia, serif",
  fontSize: "56px",
  lineHeight: "56px",
  color: "#10b981",
  opacity: 0.15,
  fontWeight: 400,
  fontStyle: "normal",
};

const QUOTE_CARD_FOOTER_STYLE: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: "20px",
  marginTop: "auto",
};

const QUOTE_CARD_TITLE_STYLE: React.CSSProperties = {
  color: "#111827",
  fontFamily: QUOTE_CARD_SERIF_FONT,
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 600,
  fontStyle: "normal",
  letterSpacing: "0px",
  margin: "0 0 6px 0",
  padding: 0,
};

const QUOTE_CARD_SOURCE_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const QUOTE_CARD_AUTHOR_STYLE: React.CSSProperties = {
  color: "#6b7280",
  fontFamily: QUOTE_CARD_SANS_FONT,
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: 600,
  fontStyle: "normal",
  letterSpacing: "1px",
  textTransform: "uppercase",
  margin: 0,
  padding: 0,
};

const QUOTE_CARD_BRAND_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const QUOTE_CARD_BRAND_DOT_STYLE: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#10b981",
};

const QUOTE_CARD_BRAND_TEXT_STYLE: React.CSSProperties = {
  color: "#9ca3af",
  fontFamily: QUOTE_CARD_SANS_FONT,
  fontSize: "10px",
  lineHeight: "14px",
  fontWeight: 600,
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const QUOTE_MODAL_ACTIONS_STYLE: React.CSSProperties = { gap: "16px", marginTop: "16px" };
const QUOTE_MODAL_ICON_BUTTON_STYLE: React.CSSProperties = { width: "48px", height: "48px" };
const QUOTE_MODAL_DOWNLOAD_BUTTON_STYLE: React.CSSProperties = { minHeight: "48px", padding: "12px 24px", gap: "8px" };

interface QuoteModalProps {
  text: string;
  newsTitle: string;
  author: string;
  onClose: () => void;
}

export default function QuoteModal({ text, newsTitle, author, onClose }: QuoteModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { showToast } = useBottomToast();
  const formattedText = formatQuoteText(text);

  // 锁定 body 滚动，防止弹窗后滑动背景
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  const waitForLayoutSettled = async () => {
    if (typeof window === "undefined") return;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  };

  const ensureFontsReady = async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    await Promise.all([
      document.fonts.load(`400 ${QUOTE_CARD_QUOTE_STYLE.fontSize} ${QUOTE_CARD_SERIF_FONT}`),
      document.fonts.load(`italic 400 ${QUOTE_CARD_QUOTE_STYLE.fontSize} ${QUOTE_CARD_SERIF_FONT}`),
      document.fonts.load(`600 ${QUOTE_CARD_TITLE_STYLE.fontSize} ${QUOTE_CARD_SERIF_FONT}`),
      document.fonts.load(`600 ${QUOTE_CARD_AUTHOR_STYLE.fontSize} ${QUOTE_CARD_SANS_FONT}`),
      document.fonts.load(`600 ${QUOTE_CARD_BRAND_TEXT_STYLE.fontSize} ${QUOTE_CARD_SANS_FONT}`),
    ]);
    await document.fonts.ready;
  };

  const saveToGallery = async (canvas: HTMLCanvasElement, fileName: string) => {
    const fileBase = fileName.replace(/\.(png|jpg|jpeg)$/i, "");
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.95);

    try {
      await saveImageToAlbum({
        path: jpegDataUrl,
        fileName: fileBase,
      });
      return;
    } catch (error) {
      console.warn("Save quote as JPEG failed, retrying as PNG:", error);
    }

    const pngDataUrl = canvas.toDataURL("image/png");
    await saveImageToAlbum({
      path: pngDataUrl,
      fileName: fileBase,
    });
  };

  const isPermissionError = (message: string) => {
    const text = message.toLowerCase();
    return text.includes("permission") || text.includes("denied") || text.includes("not allowed") || text.includes("unauthorized");
  };

  const getSaveFailureToast = (message: string) => {
    if (isPermissionError(message)) return "Save failed. Please allow Photos permission.";
    return "Save failed. Please try again.";
  };

  const saveViaWeb = async (canvas: HTMLCanvasElement, fileName: string) => {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
    if (!blob) throw new Error("Failed to create blob");

    const file = new File([blob], fileName, { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Quote" });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setSaved(false);
    setSaveError(null);
    try {
      await ensureFontsReady();
      await waitForLayoutSettled();

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const fileName = `quote-${Date.now()}.jpg`;

      if (Capacitor.isNativePlatform()) {
        await saveToGallery(canvas, fileName);
      } else {
        await saveViaWeb(canvas, fileName);
      }

      setSaved(true);
      showToast(Capacitor.isNativePlatform() ? "Saved to photos" : "Download started", "success");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Failed to generate image", err);
      const message = err instanceof Error ? err.message : "Failed to save image";
      setSaveError(message);
      showToast(getSaveFailureToast(message), "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderQuoteCard = (ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} style={QUOTE_CARD_CONTAINER_STYLE}>
      <div style={QUOTE_CARD_DECORATION_BAND_STYLE} />
      <div style={QUOTE_CARD_DECORATION_GLOW_STYLE} />

      <div style={QUOTE_CARD_CONTENT_STYLE}>
        <div style={QUOTE_CARD_BODY_STYLE}>
          <div style={QUOTE_MARK_CONTAINER_STYLE}>
            <span style={QUOTE_OPEN_MARK_STYLE}>"</span>
            <span style={QUOTE_CLOSE_MARK_STYLE}>"</span>
          </div>

          <p style={QUOTE_CARD_QUOTE_STYLE}>{formattedText}</p>
        </div>

        <div style={QUOTE_CARD_FOOTER_STYLE}>
          <h4 style={QUOTE_CARD_TITLE_STYLE}>{newsTitle}</h4>
          <div style={QUOTE_CARD_SOURCE_ROW_STYLE}>
            <p style={QUOTE_CARD_AUTHOR_STYLE}>{author}</p>
            <div style={QUOTE_CARD_BRAND_STYLE}>
              <span style={QUOTE_CARD_BRAND_DOT_STYLE} />
              <span style={QUOTE_CARD_BRAND_TEXT_STYLE}>Seventh Tone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-popup onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* 隐藏截图容器 - 与 ShareCardModal 同款离屏截图 */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {renderQuoteCard(cardRef)}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative flex flex-col items-center w-full"
        style={{ maxWidth: "min(calc(100% - 32px), 500px)" }}
      >
        {/* 预览卡片 - 缩放显示，使用 overscroll-contain 防止滑出 */}
        <div
          className="w-full overscroll-contain flex justify-center"
          style={{
            maxHeight: "55vh",
            overflowY: "auto",
            overflowX: "hidden",
            borderRadius: "16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top center",
              width: `${QUOTE_CARD_WIDTH}px`,
              flexShrink: 0,
              marginBottom: `-${(1 - PREVIEW_SCALE) * 100}%`,
            }}
          >
            {/* 仅用于预览，截图使用离屏容器 */}
            {renderQuoteCard()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center" style={QUOTE_MODAL_ACTIONS_STYLE}>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-colors"
            style={QUOTE_MODAL_ICON_BUTTON_STYLE}
          >
            <X size={20} />
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={`flex items-center rounded-full shadow-lg transition-colors disabled:opacity-70 ${
              saved ? "bg-emerald-600 text-white" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
            style={QUOTE_MODAL_DOWNLOAD_BUTTON_STYLE}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Download size={18} />}
            {saved && <span className="text-sm font-bold uppercase tracking-widest">Saved</span>}
          </button>
        </div>
        {saveError && <p className="mt-4 text-center text-xs text-red-500 dark:text-red-400">{saveError}</p>}
      </motion.div>
    </div>
  );
}
