import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const readSource = (relativePath: string) => readFileSync(join(rootDir, relativePath), "utf8");

test("Bookmarks page removes the local page heading and keeps tabs flush under the header", () => {
  const source = readSource("src/pages/Bookmarks.tsx");

  assert.doesNotMatch(source, />Library</);
  assert.match(source, /className="pb-32"/);
  assert.match(source, /w-full rounded-none bg-gray-50\/80/);
  assert.match(source, /dark:bg-slate-800\/45/);
  assert.match(source, /px-0/);
  assert.match(source, /className=\{`flex-1 border-b-2 py-3 rounded-none text-xs font-semibold transition-colors/);
  assert.match(source, /\? "border-b-2 border-brand text-gray-900 dark:border-emerald-400 dark:text-gray-100"/);
  assert.match(source, /: "border-b-2 border-transparent text-gray-500 dark:text-gray-400"/);
});
