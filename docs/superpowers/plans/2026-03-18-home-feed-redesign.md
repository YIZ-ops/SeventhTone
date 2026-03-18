# Home Feed Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/home` category grid with a section-based editorial feed backed by the Sixth Tone homepage JSON, while keeping category navigation available from a top-left chooser and filtering out `DAILY TONES`.

**Architecture:** Add a dedicated homepage normalization layer first, with pure-function tests that lock the section filtering and hero-selection rules. Then connect a new homepage API path for both native and web, replace the `CategoryList` page with a feed container, and keep `/category/:id` as the unchanged deep-list route for category navigation.

**Tech Stack:** React 19, React Router 7, TypeScript, existing `request`/Capacitor networking helpers, Node test runner via `node --import tsx --test`

---

## Chunk 1: Data Model And Fetching

### Task 1: Define home-feed types

**Files:**
- Modify: `src/types.ts`
- Test: `tests/home-feed-normalization.test.ts`

- [ ] **Step 1: Write the failing type-oriented normalization test**

```ts
test("normalizeHomeFeedResponse keeps section order and hero metadata", () => {
  const normalized = normalizeHomeFeedResponse(samplePayload);
  assert.equal(normalized[0].layout, "hero");
  assert.equal(normalized[1].title, "NEWS");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: FAIL because `normalizeHomeFeedResponse` and home-feed types do not exist yet.

- [ ] **Step 3: Add the minimal home-feed type definitions**

Add focused types to `src/types.ts` for:

- `HomeFeedSectionLayout = "hero" | "list"`
- `HomeFeedArticle`
- `HomeFeedSection`
- `HomeFeedResponse`

Keep these types normalized and app-specific rather than mirroring the entire remote payload.

- [ ] **Step 4: Re-run the test**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: FAIL moves forward to missing implementation details, not missing types.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts tests/home-feed-normalization.test.ts
git commit -m "test: add home feed type coverage"
```

### Task 2: Add homepage normalization helpers

**Files:**
- Create: `src/api/homeFeed.ts`
- Modify: `src/types.ts`
- Test: `tests/home-feed-normalization.test.ts`

- [ ] **Step 1: Expand the failing test to cover filtering and hero rules**

```ts
test("normalizeHomeFeedResponse filters Daily Tones and uses first child for hero", () => {
  const normalized = normalizeHomeFeedResponse(samplePayload);

  assert.equal(normalized.some((section) => section.title === "DAILY TONES"), false);
  assert.equal(normalized[0].layout, "hero");
  assert.equal(normalized[0].items.length, 1);
  assert.equal(normalized[0].items[0].name, "Love in the Time of Algorithms");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: FAIL because the helper is not implemented.

- [ ] **Step 3: Implement the minimal normalization helpers**

In `src/api/homeFeed.ts`, add:

- `isDailyTonesSection(section)`
- `normalizeHomeFeedArticle(item)`
- `normalizeHomeFeedResponse(payload)`

Rules:

- skip sections with missing/empty `childList`
- skip sections named `DAILY TONES`
- skip sections where `nodeInfo?.name === "DAILYTONE"`
- `cardMode === "1"` becomes `layout: "hero"` and only keeps `childList[0]`
- all other sections become `layout: "list"` and keep normalized child items

- [ ] **Step 4: Re-run the test**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/homeFeed.ts src/types.ts tests/home-feed-normalization.test.ts
git commit -m "feat: add home feed normalization helpers"
```

### Task 3: Add homepage fetch paths for native and web

**Files:**
- Modify: `src/api/base.ts`
- Modify: `src/api/homeFeed.ts`
- Modify: `server.ts`
- Test: `tests/home-feed-normalization.test.ts`

- [ ] **Step 1: Write a failing test for fetch source selection**

```ts
test("getHomeFeed uses normalized pageInfo list from homepage payload", async () => {
  const payload = { pageProps: { data: { pageInfo: { list: sampleSections } } } };
  const sections = extractHomeFeedSections(payload);
  assert.equal(sections.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: FAIL because the extraction helper does not exist.

- [ ] **Step 3: Implement minimal fetch/extract support**

In `src/api/homeFeed.ts`:

- add `extractHomeFeedSections(payload)`
- add `getHomeFeed()` that:
  - on native: requests the Sixth Tone homepage JSON directly
  - on web: requests a local relay endpoint such as `/api/home-feed`
  - normalizes with `normalizeHomeFeedResponse`

In `src/api/base.ts`:

- add homepage URL helpers using `DEFAULT_BUILD_ID`
- add fallback build-id resolution from the Sixth Tone homepage HTML if the JSON path fails

In `server.ts`:

- add `/api/home-feed`
- proxy the remote homepage JSON
- fall back to resolving the latest build ID from the homepage HTML using the same pattern already used for `/api/news/:id`

- [ ] **Step 4: Re-run the test**

Run: `node --import tsx --test tests/home-feed-normalization.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/base.ts src/api/homeFeed.ts server.ts tests/home-feed-normalization.test.ts
git commit -m "feat: add home feed fetch support"
```

## Chunk 2: UI Integration

### Task 4: Add focused home-feed presentation components

**Files:**
- Create: `src/components/home/HomeHero.tsx`
- Create: `src/components/home/HomeSection.tsx`
- Create: `src/components/home/HomeCategoryDrawer.tsx`
- Test: `tests/home-feed-structure.test.ts`

- [ ] **Step 1: Write failing structure tests**

```ts
test("HomeHero renders title over image markup", () => {
  const source = readFileSync("src/components/home/HomeHero.tsx", "utf8");
  assert.match(source, /absolute inset-0/);
  assert.match(source, /font-serif font-bold/);
});

test("HomeCategoryDrawer links to category routes", () => {
  const source = readFileSync("src/components/home/HomeCategoryDrawer.tsx", "utf8");
  assert.match(source, /to=\\{`\\/category\\/\\$\\{category.id\\}`\\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/home-feed-structure.test.ts`
Expected: FAIL because the files do not exist.

- [ ] **Step 3: Implement the minimal presentational components**

`HomeHero.tsx`:

- accepts one normalized article item
- renders image, dark overlay, title, optional summary/category badge
- routes to `/news/:contId`

`HomeSection.tsx`:

- accepts a section title and normalized articles
- renders the section heading
- maps items through `NewsCard`

`HomeCategoryDrawer.tsx`:

- accepts `open`, `categories`, `onClose`
- renders a dismissible overlay with category links to `/category/:id`

- [ ] **Step 4: Re-run the test**

Run: `node --import tsx --test tests/home-feed-structure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HomeHero.tsx src/components/home/HomeSection.tsx src/components/home/HomeCategoryDrawer.tsx tests/home-feed-structure.test.ts
git commit -m "feat: add home feed presentation components"
```

### Task 5: Replace the category grid page with the new home feed

**Files:**
- Modify: `src/pages/CategoryList.tsx`
- Modify: `src/api/categories.ts`
- Modify: `src/components/news/NewsCard.tsx` (only if a small prop or styling hook is needed)
- Test: `tests/navigation-structure.test.ts`
- Test: `tests/home-feed-structure.test.ts`

- [ ] **Step 1: Write the failing page structure test**

```ts
test("CategoryList uses the home feed API and category drawer", () => {
  const source = readFileSync("src/pages/CategoryList.tsx", "utf8");
  assert.match(source, /getHomeFeed/);
  assert.match(source, /HomeCategoryDrawer/);
  assert.match(source, /HomeHero/);
  assert.match(source, /HomeSection/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/navigation-structure.test.ts tests/home-feed-structure.test.ts`
Expected: FAIL because `CategoryList.tsx` still contains the old category grid implementation.

- [ ] **Step 3: Implement the minimal page rewrite**

Rewrite `src/pages/CategoryList.tsx` to:

- load categories and home-feed sections in parallel
- manage `loading`, `error`, `drawerOpen`, and retry state
- show a compact top bar row with a top-left category icon button
- render sections in order
- render `layout === "hero"` through `HomeHero`
- render `layout === "list"` through `HomeSection`
- preserve Android back-to-exit behavior for the `/home` route

If `src/api/categories.ts` still filters by `node.name !== "DAILY TONES"`, keep that behavior so the chooser remains consistent.

Only touch `NewsCard.tsx` if a tiny prop such as `compact`, `className`, or heading override is genuinely needed. Avoid refactoring it otherwise.

- [ ] **Step 4: Re-run the tests**

Run: `node --import tsx --test tests/navigation-structure.test.ts tests/home-feed-normalization.test.ts tests/home-feed-structure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CategoryList.tsx src/api/categories.ts src/components/news/NewsCard.tsx tests/navigation-structure.test.ts tests/home-feed-structure.test.ts tests/home-feed-normalization.test.ts
git commit -m "feat: replace home grid with editorial feed"
```

### Task 6: Verify the full change set

**Files:**
- Modify: none unless verification finds issues
- Test: `tests/navigation-structure.test.ts`
- Test: `tests/home-feed-normalization.test.ts`
- Test: `tests/home-feed-structure.test.ts`

- [ ] **Step 1: Run the targeted test suite**

Run: `node --import tsx --test tests/navigation-structure.test.ts tests/home-feed-normalization.test.ts tests/home-feed-structure.test.ts`
Expected: all tests PASS

- [ ] **Step 2: Run typecheck**

Run: `cmd /c npm run lint`
Expected: `tsc --noEmit` exits 0

- [ ] **Step 3: Manually smoke-check the feed in app mode**

Run: `npm run dev`

Verify:

- `/home` shows sections in API order
- hero block is only used for `cardMode="1"`
- `DAILY TONES` is hidden
- category icon opens chooser
- category tap routes to `/category/:id`

- [ ] **Step 4: Fix any issues found and re-run verification**

Repeat the exact failing command until clean.

- [ ] **Step 5: Final commit**

```bash
git add src tests server.ts
git commit -m "chore: verify home feed redesign"
```

