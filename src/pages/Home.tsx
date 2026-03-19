import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { getCategories } from "../api/categories";
import { getHomeFeed } from "../api/homeFeed";
import HomeCategoryDrawer from "../components/home/HomeCategoryDrawer";
import HomeHero from "../components/home/HomeHero";
import HomeSection from "../components/home/HomeSection";
import { useAndroidBackHandler } from "../hooks/useAndroidBackHandler";
import type { Category, HomeFeedSection } from "../types";

const PULL_THRESHOLD = 70;
const PULL_MAX = 100;

const resolveSectionCategoryHref = (section: HomeFeedSection) => {
  if (section.cardMode === "5" && section.title === "MOST READ") return undefined;
  const nodeId = section.nodeInfo?.nodeId ?? section.items[0]?.nodeInfo?.nodeId ?? section.items[0]?.nodeId;
  return nodeId && nodeId > 0 ? `/category/${nodeId}` : undefined;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<HomeFeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackAtRef = useRef(0);
  const toastElRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pullYRef = useRef(0);
  const loadingGuardRef = useRef(false);

  const showExitToast = useCallback(() => {
    if (toastElRef.current) return;

    const toastEl = document.createElement("div");
    toastEl.textContent = "再按一次退出程序";
    Object.assign(toastEl.style, {
      position: "fixed",
      bottom: "96px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.75)",
      color: "white",
      padding: "10px 22px",
      borderRadius: "24px",
      fontSize: "14px",
      zIndex: "9999",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(toastEl);
    toastElRef.current = toastEl;

    toastTimerRef.current = setTimeout(() => {
      if (toastElRef.current && document.body.contains(toastElRef.current)) {
        document.body.removeChild(toastElRef.current);
      }
      toastElRef.current = null;
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastElRef.current && document.body.contains(toastElRef.current)) {
        document.body.removeChild(toastElRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOpenCategories = () => setDrawerOpen(true);
    window.addEventListener("home-categories:open", handleOpenCategories);
    return () => window.removeEventListener("home-categories:open", handleOpenCategories);
  }, []);

  const loadData = useCallback(async (forceRefresh = false, showLoading = true) => {
    if (loadingGuardRef.current) return;

    loadingGuardRef.current = true;
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [feedResult, categoriesResult] = await Promise.allSettled([getHomeFeed(forceRefresh), getCategories()]);

      if (feedResult.status === "rejected") {
        throw feedResult.reason;
      }

      setSections(feedResult.value);
      setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value : []);
    } finally {
      loadingGuardRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load home feed");
      setLoading(false);
    });
  }, [loadData]);

  const onPullRefresh = useCallback(() => {
    if (loadingGuardRef.current || drawerOpen) return;
    setRefreshing(true);
    loadData(true, false).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to refresh home feed");
      setRefreshing(false);
    });
  }, [drawerOpen, loadData]);

  useEffect(() => {
    const startY = { current: 0 };
    const scrollYAtStart = { current: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      scrollYAtStart.current = window.scrollY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (drawerOpen || scrollYAtStart.current > 10 || loadingGuardRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const val = Math.min(dy, PULL_MAX);
        pullYRef.current = val;
        setPullY(val);
      }
    };

    const handleTouchEnd = () => {
      if (pullYRef.current >= PULL_THRESHOLD) {
        onPullRefresh();
      }
      pullYRef.current = 0;
      setPullY(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [drawerOpen, onPullRefresh]);

  useAndroidBackHandler(() => {
    if (drawerOpen) {
      setDrawerOpen(false);
      return;
    }

    const now = Date.now();
    if (now - lastBackAtRef.current < 2000) {
      CapacitorApp.exitApp();
      return;
    }

    lastBackAtRef.current = now;
    showExitToast();
  });

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl flex-col items-center justify-center px-4 py-8 pb-32">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl flex-col items-center justify-center px-4 py-8 pb-32">
        <div className="w-full max-w-md rounded-[1.75rem] border border-red-100 bg-white p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-slate-800">
          <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => {
              loadData().catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load home feed");
                setLoading(false);
              });
            }}
            className="rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstHeroIndex = sections.findIndex((section) => section.layout === "hero" && Boolean(section.items[0]));
  const firstHero = firstHeroIndex >= 0 ? sections[firstHeroIndex] : null;
  const remainingSections = sections.filter((_, index) => index !== firstHeroIndex);

  return (
    <>
      <HomeCategoryDrawer open={drawerOpen} categories={categories} onClose={() => setDrawerOpen(false)} />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-32">
        <div
          className="mx-auto flex max-w-4xl items-center justify-center transition-all duration-200 pointer-events-none"
          style={{ height: pullY > 0 || refreshing ? 56 : 0, opacity: pullY > 0 || refreshing ? 1 : 0 }}
        >
          {refreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          ) : (
            <span className="text-xs text-gray-400">{pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
          )}
        </div>

        <div className="relative">
          {firstHero?.items[0] ? (
            <div className="relative left-1/2 w-screen -translate-x-1/2">
              <HomeHero item={firstHero.items[0]} />
            </div>
          ) : (
            <div className="h-28 bg-gradient-to-b from-gray-100 to-transparent dark:from-slate-900" />
          )}
        </div>

        <div className="mx-auto mt-6 max-w-4xl space-y-6 px-4 md:px-6">
          {remainingSections.map((section, index) => (
            <div key={`${section.title || section.nodeInfo?.name || "section"}-${index}`}>
              <HomeSection
                title={section.title || section.nodeInfo?.name || "SECTION"}
                items={section.items}
                categoryHref={resolveSectionCategoryHref(section)}
              />
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
