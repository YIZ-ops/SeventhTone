import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

const readSource = (relativePath: string) => readFileSync(join(rootDir, relativePath), "utf8");

test("default route redirects to Home and keeps sections under /home", () => {
  const appSource = readSource("src/App.tsx");

  assert.match(appSource, /<Route path="\/" element={<Navigate to="\/home" replace \/>} \/>/);
  assert.match(appSource, /import Home from "\.\/pages\/Home";/);
  assert.match(appSource, /<Route path="\/home" element={<Home \/>} \/>/);
});

test("home navigation points to /home instead of root", () => {
  const bottomNavSource = readSource("src/components/BottomNav.tsx");
  const headerSource = readSource("src/components/Header.tsx");

  assert.match(bottomNavSource, /\{ to: "\/home", icon: Home, label: "Home" \}/);
  assert.match(headerSource, /const isHome = location\.pathname === "\/home";/);
  assert.match(headerSource, /<Link to="\/home" className="group flex shrink-0 items-center space-x-2">/);
  assert.match(headerSource, /openHomeCategories/);
  assert.match(headerSource, /<Search size=\{18\} \/>/);
});

test("bookmarks title is rendered by the global header", () => {
  const headerSource = readSource("src/components/Header.tsx");

  assert.match(headerSource, /"\/bookmarks": \{ title: "Bookmarks"/);
});

test("DailyTone hero content is not wrapped in a news detail link", () => {
  const dailyTonesSource = readSource("src/pages/DailyTones.tsx");

  assert.doesNotMatch(dailyTonesSource, /<Link to=\{`\/news\/\$\{items\[activeSlide\]\?\.contId\}`\}>/);
});
