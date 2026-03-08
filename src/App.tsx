/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useTheme } from "./contexts/ThemeContext";
import CategoryList from "./pages/CategoryList";
import ArticleList from "./pages/ArticleList";
import ArticleDetailView from "./pages/ArticleDetail";
import ArticlePractice from "./pages/ArticlePractice";
import History from "./pages/History";
import Bookmarks from "./pages/Bookmarks";
import DailyTones from "./pages/DailyTones";
import Search from "./pages/Search";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

function AppContent() {
  const location = useLocation();
  const isArticleDetail = location.pathname.startsWith("/article/");
  const isPractice = location.pathname.startsWith("/practice/");
  const isDailyTones = location.pathname === "/daily-tones";
  const isArticleList = location.pathname.startsWith("/category/");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* 文章列表页顶栏由 ArticleList 内随滚动显示，此处不渲染 */}
      {!isArticleDetail && !isDailyTones && !isArticleList && !isPractice && <Header />}
      <main className={isArticleDetail || isDailyTones || isPractice ? "" : "pb-16"}>
        <Routes>
          <Route path="/" element={<CategoryList />} />
          <Route path="/category/:id" element={<ArticleList />} />
          <Route path="/history" element={<History />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/daily-tones" element={<DailyTones />} />
          <Route path="/search" element={<Search />} />
          <Route path="/article/:id" element={<ArticleDetailView />} />
          <Route path="/practice/:id" element={<ArticlePractice />} />
        </Routes>
      </main>
      {!isArticleDetail && !isPractice && <BottomNav />}
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  // Initialise safe-area CSS variable once on startup.
  // `env(safe-area-inset-top)` is unreliable on Android < 11; probe it and
  // set `--sat` so every `.pt-safe` rule can use `var(--sat)` instead.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
    document.documentElement.appendChild(probe);

    const h = probe.offsetHeight;
    document.documentElement.removeChild(probe);

    if (h > 0) {
      document.documentElement.style.setProperty("--sat", `${h}px`);
    } else if (Capacitor.getPlatform() === "android") {
      // env() not supported on this WebView — use the standard Android
      // status bar height (24dp ≈ 24 CSS px at mdpi / xhdpi / xxhdpi).
      document.documentElement.style.setProperty("--sat", "24px");
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Style.Dark = 浅色文字，用于深色背景；Style.Light = 深色文字，用于浅色背景
    StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }).catch(() => {});
  }, [theme]);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
