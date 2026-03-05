/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import CategoryList from "./pages/CategoryList";
import ArticleList from "./pages/ArticleList";
import ArticleDetailView from "./pages/ArticleDetail";
import History from "./pages/History";
import Bookmarks from "./pages/Bookmarks";
import DailyTones from "./pages/DailyTones";
import Search from "./pages/Search";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

function AppContent() {
  const location = useLocation();
  const isArticleDetail = location.pathname.startsWith("/article/");
  const isDailyTones = location.pathname === "/daily-tones";
  const isArticleList = location.pathname.startsWith("/category/");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* 文章列表页顶栏由 ArticleList 内随滚动显示，此处不渲染 */}
      {!isArticleDetail && !isDailyTones && !isArticleList && <Header />}
      <main className={isArticleDetail || isDailyTones ? "" : "pb-16"}>
        <Routes>
          <Route path="/" element={<CategoryList />} />
          <Route path="/category/:id" element={<ArticleList />} />
          <Route path="/history" element={<History />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/daily-tones" element={<DailyTones />} />
          <Route path="/search" element={<Search />} />
          <Route path="/article/:id" element={<ArticleDetailView />} />
        </Routes>
      </main>
      {!isArticleDetail && <BottomNav />}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide();
    }
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}
