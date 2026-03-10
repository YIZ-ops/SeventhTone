/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useTheme } from "./contexts/ThemeContext";
import CategoryList from "./pages/CategoryList";
import NewsList from "./pages/NewsList";
import NewsDetailView from "./pages/NewsDetail";
import NewsPractice from "./pages/NewsPractice";
import DailyTones from "./pages/DailyTones";
import Search from "./pages/Search";
import My from "./pages/My";
import Bookmarks from "./pages/Bookmarks";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

function AppContent() {
  const location = useLocation();
  const isNewsDetail = location.pathname.startsWith("/news/");
  const isPractice = location.pathname.startsWith("/practice/");
  const isDailyTones = location.pathname === "/daily-tones";
  const isNewsList = location.pathname.startsWith("/category/");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans">
      {!isNewsDetail && !isDailyTones && !isNewsList && !isPractice && <Header />}
      <main className={isNewsDetail || isDailyTones || isPractice ? "" : "pb-16"}>
        <Routes>
          <Route path="/" element={<CategoryList />} />
          <Route path="/category/:id" element={<NewsList />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/history" element={<Navigate to="/me/history" replace />} />
          <Route path="/daily-tones" element={<DailyTones />} />
          <Route path="/search" element={<Search />} />
          <Route path="/me" element={<My />} />
          <Route path="/me/saved" element={<Navigate to="/bookmarks" replace />} />
          <Route path="/me/points" element={<My />} />
          <Route path="/me/history" element={<My />} />
          <Route path="/me/settings" element={<My />} />
          <Route path="/me/about" element={<My />} />
          <Route path="/news/:id" element={<NewsDetailView />} />
          <Route path="/practice/:id" element={<NewsPractice />} />
        </Routes>
      </main>
      {!isNewsDetail && !isPractice && <BottomNav />}
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
    document.documentElement.appendChild(probe);

    const h = probe.offsetHeight;
    document.documentElement.removeChild(probe);

    if (h > 0) {
      document.documentElement.style.setProperty("--sat", `${h}px`);
    } else if (Capacitor.getPlatform() === "android") {
      document.documentElement.style.setProperty("--sat", "24px");
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }).catch(() => {});
  }, [theme]);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
