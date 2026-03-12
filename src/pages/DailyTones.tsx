import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { ChevronLeft, ChevronRight, Download, ImageOff, Loader2, Calendar as CalendarIcon, X } from "lucide-react";
import { getDailyTonesByDate, getDailyTonesCalendar } from "../api/dailyTones";
import { NewsItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Media } from "@capacitor-community/media";
import { saveRemoteImageToAlbum } from "../utils/mediaSave";
import { useBottomToast } from "../utils/toast";

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (dateText: string) => {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return dateText;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const toYearMonth = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
};

const toYearMonthLabel = (d: Date) => {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
};

const addMonth = (date: Date, delta: number) => {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export default function DailyTones() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toInputDate(today));
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [daysInMonth, setDaysInMonth] = useState<string[]>([]);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeIsH = useRef<boolean | null>(null);
  const { showToast } = useBottomToast();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let handle: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", () => {
      navigate("/");
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove?.();
    };
  }, [navigate]);

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const ym = toYearMonth(monthCursor);
        const res = await getDailyTonesCalendar(ym);
        const list = (res?.data?.calendar || [])
          .map((entry: any) => {
            const day = String(entry?.day || "").padStart(2, "0");
            if (!day) return "";
            return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-${day}`;
          })
          .filter(Boolean);
        setDaysInMonth(list);
        if (list.length > 0 && !list.includes(selectedDate)) {
          setSelectedDate(list[list.length - 1]);
        }
      } catch {
        setDaysInMonth([]);
      }
    };

    loadCalendar();
  }, [monthCursor, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDailyTonesByDate(selectedDate);
        if (!cancelled) {
          setItems((res?.data?.contList || []) as NewsItem[]);
          setActiveSlide(0);
          if (sliderRef.current) {
            sliderRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Daily Tones");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const monthLabel = useMemo(() => toYearMonthLabel(monthCursor), [monthCursor]);

  const handleSliderScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / width);
    setActiveSlide(index);
  };

  const goToSlide = (index: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(index, items.length - 1));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const renderCalendar = () => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysCount = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);
    const blanksArray = Array.from({ length: firstDay }, (_, i) => i);
    const todayStr = toInputDate(today);

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-4 right-4 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-50"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonthCursor((prev) => addMonth(prev, -1))}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <p className="text-sm font-medium tracking-widest uppercase text-white/90">{monthLabel}</p>
          <button
            onClick={() => setMonthCursor((prev) => addMonth(prev, 1))}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="text-center text-[10px] uppercase tracking-wider text-white/40 font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanksArray.map((i) => (
            <div key={`blank-${i}`} className="h-10" />
          ))}
          {daysArray.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = dateStr === selectedDate;
            const isFuture = dateStr > todayStr;
            const hasData = daysInMonth.includes(dateStr);

            return (
              <button
                key={day}
                disabled={isFuture}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setShowCalendar(false);
                }}
                className={`h-10 rounded-xl flex items-center justify-center text-sm transition-all ${
                  isSelected
                    ? "bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : isFuture
                      ? "text-white/20 cursor-not-allowed"
                      : hasData
                        ? "text-white hover:bg-white/10 font-medium"
                        : "text-white/40 hover:bg-white/5"
                }`}
              >
                {day}
                {hasData && !isSelected && !isFuture && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-emerald-400/50" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const handleSwipeStart = (e: TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeIsH.current = null;
  };
  const handleSwipeMove = (e: TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;
    if (swipeIsH.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeIsH.current = Math.abs(dx) > Math.abs(dy);
    }
  };
  const handleSwipeEnd = (e: TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const wasH = swipeIsH.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeIsH.current = null;
    if (!wasH) return;
    if (dx < -50) goToSlide(activeSlide + 1);
    else if (dx > 50) goToSlide(activeSlide - 1);
  };

  const handleDownloadImage = async () => {
    if (isSaving) return;
    const activeItem = items[activeSlide];
    const imageUrl = activeItem?.pic || activeItem?.appHeadPic;
    if (!imageUrl) {
      setSaveError("No image available for download.");
      showToast("No image available.", "error");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const filenameBase = `daily-tone-${selectedDate}-${activeItem.contId || activeSlide + 1}`;

    if (!Capacitor.isNativePlatform()) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filenameBase}.jpg`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast("Download started.", "success");
      } catch (error) {
        console.error("Download failed:", error);
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${filenameBase}.jpg`;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Opened image in a new tab.", "success");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      await saveRemoteImageToAlbum({ imageUrl, fileName: filenameBase });
      showToast("Saved to photos.", "success");
    } catch (error) {
      console.error("Save to album failed:", error);
      const message = error instanceof Error ? error.message : "Failed to save to album.";
      setSaveError(message);
      showToast("Save failed. Please allow Photos permission.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white overflow-hidden"
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
    >
      {/* Background Image Slider */}
      <div className="absolute inset-0 z-0">
        {!loading && !error && items.length > 0 ? (
          <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar h-full w-full">
            {items.map((item) => (
              <div key={item.contId} className="snap-start min-w-full h-full relative">
                <img
                  src={item.pic || item.appHeadPic}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Gradient overlays for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-950" />
        )}
      </div>

      {/* Top Overlay: Header & Calendar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe bg-gradient-to-b from-black/80 to-transparent pb-8 pointer-events-none">
        <header className="px-6 pt-6 pb-4 pointer-events-auto relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="h-px w-6 bg-emerald-400"></span>
                <span className="text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase">Daily Tones</span>
              </div>
              <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center space-x-2 group">
                <h1 className="text-2xl font-serif font-bold tracking-tight group-hover:text-emerald-300 transition-colors">
                  {formatDisplayDate(selectedDate)}
                </h1>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  {showCalendar ? <X size={12} /> : <CalendarIcon size={12} />}
                </div>
              </button>
            </div>
          </div>

          <AnimatePresence>{showCalendar && renderCalendar()}</AnimatePresence>
        </header>
      </div>

      {/* Center States */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        {loading && (
          <div className="flex flex-col items-center text-white/70">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-400" />
          </div>
        )}
        {error && (
          <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center text-white/50 bg-black/30 backdrop-blur-md px-8 py-10 rounded-2xl border border-white/5">
            <ImageOff className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm tracking-widest uppercase">No content for {formatDisplayDate(selectedDate)}</p>
          </div>
        )}
      </div>

      {/* Bottom Overlay: Content & Controls */}
      {!loading && !error && items.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-28 pt-32 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
          <div className="px-6 pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Link to={`/news/${items[activeSlide]?.contId}`}>
                  <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-4 text-white hover:text-emerald-300 transition-colors">
                    {items[activeSlide]?.name}
                  </h2>
                  {items[activeSlide]?.summary && (
                    <p className="text-white/70 text-sm md:text-base leading-relaxed italic">{items[activeSlide].summary}</p>
                  )}
                </Link>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-8">
              {items.length > 1 ? (
                <div className="flex gap-1.5">
                  {items.map((item, index) => (
                    <button
                      key={item.contId}
                      onClick={() => goToSlide(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeSlide ? "w-8 bg-emerald-400" : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Single tone</span>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleDownloadImage}
                  disabled={isSaving}
                  className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    isSaving
                      ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105"
                  }`}
                  aria-label="Download image"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </button>
                <button
                  onClick={() => goToSlide(activeSlide - 1)}
                  disabled={activeSlide === 0 || items.length <= 1}
                  className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    activeSlide === 0 || items.length <= 1
                      ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105"
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => goToSlide(activeSlide + 1)}
                  disabled={activeSlide === items.length - 1 || items.length <= 1}
                  className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    activeSlide === items.length - 1 || items.length <= 1
                      ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105"
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            {saveError && <p className="text-red-300 text-xs mt-3">{saveError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
