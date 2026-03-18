import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractHomeFeedSections, getHomeFeed, normalizeHomeFeedResponse } from "../src/api/homeFeed";

const rootDir = process.cwd();
const readSource = (relativePath: string) => readFileSync(join(rootDir, relativePath), "utf8");

const samplePayload = {
  pageProps: {
    data: {
      pageInfo: {
        list: [
          {
            cardMode: "1",
            name: "",
            childList: [
              {
                cardMode: "2",
                contId: 1018314,
                nodeId: 26168,
                name: "Love in the Time of Algorithms",
                summary: "Hero summary",
                pubTime: "14h ago",
                pubTimeLong: 1773753285009,
                pic: "https://image.test/hero.jpg",
                appHeadPic: "https://image.test/hero-app.jpg",
                link: "",
                nodeInfo: {
                  nodeId: 26168,
                  name: "VOICES & OPINION",
                },
                userInfo: {
                  name: "Gong Xin",
                  pic: "https://image.test/author.png",
                },
              },
              {
                cardMode: "2",
                contId: 1018306,
                nodeId: 26166,
                name: "Second hero item should be grouped into NEWS",
                summary: "Should remain in grouped sections",
                pubTime: "16h ago",
                pubTimeLong: 1773744054932,
                pic: "https://image.test/ignored.jpg",
                appHeadPic: "https://image.test/ignored-app.jpg",
                link: "",
                nodeInfo: {
                  nodeId: 26166,
                  name: "NEWS",
                },
              },
            ],
          },
          {
            cardMode: "25",
            childList: [
              {
                cardMode: "2",
                contId: 1018119,
                nodeId: 26796,
                name: "6 Lives, 3 Years, and a Long Look at China’s Short-Video Era",
                summary: "Q and A summary",
                pubTime: "Jan 22",
                pubTimeLong: 1769073747337,
                pic: "https://image.test/qa.jpg",
                appHeadPic: "https://image.test/qa-app.jpg",
                link: "",
                nodeInfo: {
                  nodeId: 26796,
                  name: "Q & A",
                },
                userInfo: {
                  name: "Jiang Xinyi",
                  pic: "https://image.test/jiang.png",
                },
              },
              {
                cardMode: "2",
                contId: 1017207,
                nodeId: 26797,
                name: "Our Water: Shanghai, London Exchange Cultural Currency",
                summary: "Announcements summary",
                pubTime: "Jun 11, 2025",
                pubTimeLong: 1749638154208,
                pic: "https://image.test/announcements.jpg",
                appHeadPic: "https://image.test/announcements-app.jpg",
                link: "",
                nodeInfo: {
                  nodeId: 26797,
                  name: "ANNOUNCEMENTS",
                },
              },
            ],
          },
          {
            cardMode: "8",
            name: "DAILY TONES",
            nodeInfo: {
              nodeId: 26291,
              name: "DAILYTONE",
            },
            childList: [
              {
                cardMode: "8",
                contId: 1018309,
                nodeId: 27542,
                name: "Pocket Gym",
                summary: "Should be filtered out",
                pubTime: "20h ago",
                pubTimeLong: 1773729612233,
                pic: "https://image.test/dailytone.jpg",
                appHeadPic: "https://image.test/dailytone-app.jpg",
                link: "",
              },
            ],
          },
          {
            cardMode: "24",
            name: "NEWS",
            nodeInfo: {
              nodeId: 26166,
              name: "NEWS",
            },
            childList: [
              {
                cardMode: "2",
                contId: 1018302,
                nodeId: 26166,
                name: "Chinese University Cuts Arts Majors",
                summary: "List summary",
                pubTime: "Mar 13",
                pubTimeLong: 1773397681356,
                pic: "https://image.test/news.jpg",
                appHeadPic: "https://image.test/news-app.jpg",
                link: "",
                nodeInfo: {
                  nodeId: 26166,
                  name: "NEWS",
                },
                userInfo: {
                  name: "Jiang Xinyi",
                  pic: "https://image.test/jiang.png",
                },
              },
            ],
          },
        ],
      },
    },
  },
};

test("extractHomeFeedSections returns top-level homepage sections", () => {
  const sections = extractHomeFeedSections(samplePayload);

  assert.equal(sections.length, 4);
  assert.equal(sections[0].cardMode, "1");
  assert.equal(sections[3].name, "NEWS");
});

test("normalizeHomeFeedResponse groups flattened children by node name, filters Daily Tones, and uses first child for hero", () => {
  const normalized = normalizeHomeFeedResponse(samplePayload);

  assert.equal(normalized.length, 4);
  assert.equal(normalized[0].layout, "hero");
  assert.equal(normalized[0].items.length, 1);
  assert.equal(normalized[0].items[0].name, "Love in the Time of Algorithms");
  assert.equal(normalized[1].title, "NEWS");
  assert.deepEqual(
    normalized[1].items.map((item) => item.name),
    ["Second hero item should be grouped into NEWS", "Chinese University Cuts Arts Majors"],
  );
  assert.equal(normalized[2].title, "Q & A");
  assert.equal(normalized[2].items[0].name, "6 Lives, 3 Years, and a Long Look at China’s Short-Video Era");
  assert.equal(normalized[3].title, "ANNOUNCEMENTS");
  assert.equal(normalized[3].items[0].name, "Our Water: Shanghai, London Exchange Cultural Currency");
  assert.equal(normalized.flatMap((section) => section.items).filter((item) => item.contId === 1018314).length, 1);
  assert.equal(normalized.some((section) => section.title === "DAILY TONES"), false);
});

test("getHomeFeed is exposed as the home feed entry point", () => {
  assert.equal(typeof getHomeFeed, "function");
});

test("getHomeFeed reads and writes the home feed cache", () => {
  const source = readSource("src/api/homeFeed.ts");

  assert.match(source, /getHomeFeedCache/);
  assert.match(source, /setHomeFeedCache/);
  assert.match(source, /const cached = getHomeFeedCache\(\)/);
  assert.match(source, /if \(cached\) return cached/);
});

test("getHomeFeed supports bypassing cache for pull-to-refresh", () => {
  const source = readSource("src/api/homeFeed.ts");

  assert.match(source, /getHomeFeed = async \(forceRefresh = false\)/);
  assert.match(source, /if \(!forceRefresh\)/);
});
