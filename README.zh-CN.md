# Seventh Tone 英语新闻阅读器

**一款 AI 驱动的沉浸式英语新闻阅读与学习应用。**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)

[English](README.md)

---

## 概述

Seventh Tone News Reader 是一款面向英语学习者的跨平台新闻阅读应用。它聚合了来自 Sixth Tone 的优质英语新闻，并通过 AI 练习、内置词典、句子摘录、生词本和详尽的阅读数据分析来增强阅读体验 —— 一切都封装在简洁的移动优先界面中，可同时部署为 Web 应用和 Android 原生应用。

## 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [项目结构](#项目结构)
- [许可证](#许可证)
- [致谢](#致谢)

## 功能特性

### 📰 新闻浏览

- **分类导航** — 按主题分类浏览新闻，配有封面图和栏目描述。
- **无限滚动** — 基于 IntersectionObserver 的无缝分页加载；移动端支持下拉刷新。
- **全文搜索** — 实时关键词搜索，结果高亮显示，支持滚动加载更多。
- **每日精选（Daily Tones）** — 全屏沉浸式轮播展示每日精选内容，内置日历选择器。
- **列表缓存** — 已加载的新闻列表自动缓存，返回时即时恢复。

### 📖 沉浸阅读

- **富文本渲染** — 完整 HTML 内容经 DOMPurify 净化后呈现，排版优雅自适应。
- **阅读进度条** — 页面顶部实时显示滚动阅读进度。
- **字体大小调节** — 提供小 / 中 / 大三档阅读舒适度选择。
- **阅读时长统计** — 自动记录每篇新闻的阅读时长，切换页面时自动暂停。
- **阅读连续打卡** — 个人面板展示今日/累计阅读篇数与时长、日历热力图、连续阅读天数。

### 🔍 词汇与词典

- **即点即查词典** — 双击任意单词弹出底部词典面板，包含音标、释义、短语搭配、近义词和例句。
- **英美发音** — 词典内可播放英式和美式发音。
- **生词本** — 一键添加/移除单词及翻译；在专属生词 Tab 中统一管理。

### ✏️ 句子摘录

- **选中高亮保存** — 在新闻中选中任意句子，保存至句库并用 mark.js 高亮标记。
- **分类与笔记** — 将句子归入自定义分类，附加个人感悟。
- **引用卡片生成** — 将任意句子渲染为精美引用卡片图片（html2canvas），支持分享或保存到相册。

### 🤖 AI 智能练习

- **五大题型**，由 LLM（SiliconFlow / Qwen）自动生成：
  - 词汇填空题
  - 阅读理解选择题
  - 英译中翻译题
  - 中译英翻译题
  - 摘要写作题
- **即时反馈** — 选择题立即判对错；翻译和摘要题由 AI 打分并给出改进建议。
- **卡片式导航** — 左右滑动切换题目，配有进度条和答题卡面板。

### 📱 跨平台

- **Web + Android** — 单一代码库，同时部署为 Web 应用和 Capacitor 原生 Android 应用。
- **原生能力集成** — 状态栏主题适配、安全区域处理、原生分享、保存至相册、文件系统访问。
- **数据备份** — 将所有本地数据（历史记录、收藏、生词本、设置）导出/导入为 JSON 文件。

### 🎨 主题定制

- **深色 / 浅色模式** — 跟随系统主题，支持手动切换，偏好跨会话持久保存。
- **流畅动效** — 基于 Framer Motion 的页面转场和全局微交互。

## 技术架构

| 层级 | 技术栈                                                     |
| ---- | ---------------------------------------------------------- |
| 前端 | React 19 · React Router 7 · Tailwind CSS 4 · Framer Motion |
| 构建 | Vite 6 · TypeScript 5.8                                    |
| 后端 | Express（开发代理 & 新闻详情中转）                         |
| AI   | SiliconFlow API（OpenAI 兼容） · Qwen 2.5                  |
| 原生 | Capacitor 8（Android）                                     |
| 存储 | localStorage（历史、收藏、生词本、设置）                   |

## 快速开始

### 环境要求

- **Node.js** ≥ 22.12.0
- **npm**（随 Node.js 附带）
- **Android Studio**（可选，仅 Android 构建时需要）

### 安装

```bash
# 克隆仓库
git clone https://github.com/<your-username>/seventh-tone-news-reader.git
cd seventh-tone-news-reader

# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器（Express + Vite HMR）
npm run dev
# → http://localhost:3000
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### Android 构建

```bash
# 构建 Web 资源
npm run build

# 同步至 Android 项目
npx cap sync android

# 在 Android Studio 中打开
npx cap open android
```

## 配置说明

| 变量                          | 位置             | 说明                                       |
| ----------------------------- | ---------------- | ------------------------------------------ |
| `VITE_SILICONFLOW_API_KEY`    | `.env`           | SiliconFlow API 密钥，用于 AI 练习         |
| `ACTIVE_MODEL`                | `src/api/llm.ts` | 当前使用的 LLM 模型（默认：`Qwen2.5-7B`）  |
| `BASE_URL`                    | `src/api/api.ts` | Sixth Tone API 基础地址                    |
| `PORT`                        | `server.ts`      | 开发服务器端口（默认：`3000`）             |

## 项目结构

```
.
├── server.ts                  # Express 开发服务器（API 代理 + Vite 中间件）
├── vite.config.ts             # Vite 配置
├── capacitor.config.ts        # Capacitor 原生配置
├── src/
│   ├── App.tsx                # 根组件与路由配置
│   ├── main.tsx               # 应用入口
│   ├── types.ts               # 共享 TypeScript 类型定义
│   ├── index.css              # 全局样式（Tailwind）
│   ├── api/
│   │   ├── api.ts             # Sixth Tone API 客户端（新闻、分类、搜索）
│   │   ├── llm.ts             # SiliconFlow LLM 集成（练习题生成）
│   │   └── localData.ts       # localStorage 数据层（历史、统计、备份）
│   ├── components/
│   │   ├── Header.tsx         # 应用顶部导航栏
│   │   ├── BottomNav.tsx      # 底部标签导航
│   │   ├── NewsCard.tsx       # 可复用新闻卡片组件
│   │   ├── BookmarkModal.tsx  # 收藏分类选择器
│   │   ├── ConfirmModal.tsx   # 通用确认对话框
│   │   ├── QuoteModal.tsx     # 引用卡片图片生成器
│   │   ├── SentenceDetailModal.tsx  # 句子详情/编辑面板
│   │   └── SentenceSaveModal.tsx    # 保存句子底部弹窗
│   ├── contexts/
│   │   └── ThemeContext.tsx    # 深色/浅色主题 Provider
│   ├── pages/
│   │   ├── CategoryList.tsx   # 首页 — 分类网格
│   │   ├── NewsList.tsx       # 分类新闻列表（无限滚动）
│   │   ├── NewsDetail.tsx     # 新闻详情（词典、高亮、分享）
│   │   ├── NewsPractice.tsx   # AI 练习页
│   │   ├── DailyTones.tsx     # 每日精选轮播 + 日历
│   │   ├── Search.tsx         # 全文搜索
│   │   ├── Bookmarks.tsx      # 收藏 / 句库 / 生词本
│   │   ├── My.tsx             # 个人中心与阅读统计
│   │   ├── History.tsx        # 阅读历史时间线
│   │   ├── Settings.tsx       # 主题、字号、数据导入导出
│   │   └── About.tsx          # 关于应用
│   ├── plugins/
│   │   └── textSelectionHighlight.ts  # Android 原生文本选择插件
│   ├── store/
│   │   └── newsListCache.ts   # 内存级新闻列表缓存
│   └── utils/
│       ├── request.ts         # HTTP 请求封装（Capacitor / fetch）
│       ├── toast.ts           # Toast 通知工具
│       └── mediaSave.ts       # 媒体保存助手（相册 / 下载）
└── android/                   # Capacitor Android 工程
```

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可证。

## 致谢

- **[Sixth Tone](https://www.sixthtone.com/)** — 新闻内容来源
- **[SiliconFlow](https://siliconflow.cn/)** — LLM API 服务提供商
- **[Free Dictionary API](https://dictionaryapi.dev/)** — 词典数据
- 基于 [React](https://react.dev/)、[Vite](https://vitejs.dev/)、[Capacitor](https://capacitorjs.com/) 和 [Tailwind CSS](https://tailwindcss.com/) 构建
