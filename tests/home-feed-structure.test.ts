import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const readSource = (relativePath: string) => readFileSync(join(rootDir, relativePath), "utf8");

test("HomeHero renders title over image markup", () => {
  const source = readSource("src/components/home/HomeHero.tsx");

  assert.match(source, /absolute inset-0/);
  assert.match(source, /font-serif font-bold/);
  assert.match(source, /to=\{`\/news\/\$\{item\.contId\}`\}/);
  assert.match(source, /min-h-\[24rem\]/);
  assert.match(source, /md:min-h-\[30rem\]/);
  assert.match(source, /text-\[1\.7rem\]/);
  assert.doesNotMatch(source, /item\.nodeInfo\?\.name/);
  assert.doesNotMatch(source, /item\.summary/);
});

test("HomeCategoryDrawer links to category routes", () => {
  const source = readSource("src/components/home/HomeCategoryDrawer.tsx");

  assert.match(source, /HomeCategoryList/);
  assert.match(source, /w-\[min\(19rem,80vw\)\]/);
  assert.doesNotMatch(source, /category\.description/);
});

test("Home page is wired to the home feed UI", () => {
  const source = readSource("src/pages/Home.tsx");

  assert.match(source, /getHomeFeed/);
  assert.match(source, /HomeCategoryDrawer/);
  assert.match(source, /HomeHero/);
  assert.match(source, /HomeSection/);
  assert.match(source, /PULL_THRESHOLD = 70/);
  assert.match(source, /setRefreshing\(true\)/);
  assert.match(source, /loadData\(true, false\)/);
  assert.match(source, /window\.addEventListener\("touchstart"/);
  assert.match(source, /window\.addEventListener\("touchmove"/);
  assert.match(source, /window\.addEventListener\("touchend"/);
  assert.doesNotMatch(source, /Home Feed/);
  assert.doesNotMatch(source, /A curated long-form front page/);
});

test("HomeSection uses compact bold title treatment with a short accent underline", () => {
  const source = readSource("src/components/home/HomeSection.tsx");

  assert.match(source, /space-y-4/);
  assert.match(source, /font-extrabold uppercase tracking-\[0\.28em\]/);
  assert.match(source, /h-\[3px\] w-10 rounded-full bg-brand/);
  assert.doesNotMatch(source, /h-px w-9/);
  assert.doesNotMatch(source, /border-b border-gray-200\/70/);
});

test("Header owns the over-hero home navigation controls", () => {
  const source = readSource("src/components/Header.tsx");

  assert.match(source, /Menu/);
  assert.match(source, /home-categories:open/);
  assert.match(source, /sticky top-0 z-40/);
  assert.doesNotMatch(source, /absolute inset-x-0 top-0 z-40/);
});

test("HomeCategoryList renders icon and title without descriptions", () => {
  const source = readSource("src/components/home/HomeCategoryList.tsx");

  assert.match(source, /category\.pic \|\| category\.tonePic/);
  assert.match(source, /ring-1 ring-black\/5 dark:ring-white\/10/);
  assert.match(source, /category\.title/);
  assert.doesNotMatch(source, /category\.description/);
});

test("NewsCard uses a slightly smaller title scale", () => {
  const source = readSource("src/components/news/NewsCard.tsx");

  assert.match(source, /text-\[0\.98rem\]/);
  assert.match(source, /md:text-\[1\.16rem\]/);
  assert.doesNotMatch(source, /md:text-\[1\.45rem\]/);
  assert.doesNotMatch(source, /border-t border-gray-100/);
  assert.match(source, /gap-3 p-4/);
});
