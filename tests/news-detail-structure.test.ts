import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const readSource = (relativePath: string) => readFileSync(join(rootDir, relativePath), "utf8");

test("News detail keeps author and time on one line without divider borders", () => {
  const source = readSource("src/pages/NewsDetail.tsx");

  assert.doesNotMatch(source, /border-y border-gray-100/);
  assert.match(source, /flex flex-wrap items-center gap-x-3 gap-y-1/);
  assert.match(source, /<p className="text-sm font-semibold text-gray-900 dark:text-gray-100">/);
  assert.match(source, /<time dateTime=\{news\.pubTime\}>\{news\.pubTime\}<\/time>/);
});
