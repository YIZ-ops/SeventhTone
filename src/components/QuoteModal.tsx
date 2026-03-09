import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { Media } from "@capacitor-community/media";
import { X, Download, Loader2, Check } from "lucide-react";
import { motion } from "motion/react";

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

  const saveToGallery = async (canvas: HTMLCanvasElement, fileName: string) => {
    // @capacitor-community/media 的 savePhoto 直接支持 base64 data URL
    const dataUrl = canvas.toDataURL("image/png");
    const opts: { path: string; albumIdentifier?: string; fileName?: string } = {
      path: dataUrl,
      fileName: fileName.replace(/\.png$/i, ""),
    };
    if (Capacitor.getPlatform() === "android") {
      try {
        const { albums } = await Media.getAlbums();
        const target = albums.find((a) => a.name === "Camera Roll" || a.name === "Recent") ?? albums[0];
        if (target?.identifier) opts.albumIdentifier = target.identifier;
      } catch {
        // ignore album lookup errors
      }
    }
    await Media.savePhoto(opts);
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
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const fileName = `quote-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        await saveToGallery(canvas, fileName);
      } else {
        await saveViaWeb(canvas, fileName);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Failed to generate image", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md flex flex-col items-center"
      >
        {/* The Card to capture */}
        <div ref={cardRef} className="w-full bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-brand" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/5 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col h-full min-h-[320px]">
            <div className="mb-8">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
                <span className="text-white font-serif font-bold text-xl">S</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center mb-10">
              <p className="text-xl sm:text-2xl text-gray-900 font-serif leading-relaxed italic relative">
                <span className="text-4xl text-brand/20 absolute -top-4 -left-4 font-serif">&ldquo;</span>
                {text}
                <span className="text-4xl text-brand/20 absolute -bottom-6 -right-2 font-serif">&rdquo;</span>
              </p>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{newsTitle}</h4>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{author}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50 transition-colors"
          >
            <X size={20} />
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-colors disabled:opacity-70 ${
              saved ? "bg-emerald-600 text-white" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Download size={18} />}
            {saved && <span className="text-sm font-bold uppercase tracking-widest">Saved</span>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
