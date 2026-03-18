# Home Feed Redesign Spec

## Goal

Replace the current category-tab home page with a long-form editorial feed driven by the Sixth Tone homepage JSON payload, while keeping the existing category navigation available from a top-left icon.

## Scope

In scope:

- Replace the current [src/pages/CategoryList.tsx](C:/Users/14798/Desktop/seventh-tone-news-reader/src/pages/CategoryList.tsx) grid experience with a section-based home feed.
- Add a dedicated homepage data fetch/normalize layer for the Sixth Tone Next.js JSON response.
- Render sections in the same order returned by the homepage payload.
- Treat `cardMode="1"` sections as a hero block using only the first child item.
- Exclude `DAILY TONES` sections from the home feed.
- Keep the existing category navigation and `/category/:id` list page behavior.

Out of scope:

- Rebuilding the `DailyTones` full-screen experience inside the new home feed.
- Adding bespoke renderers for every `cardMode` variant beyond the approved `cardMode="1"` hero special case.
- Refactoring `/category/:id`, `/news/:id`, or detail parsing beyond what is needed for home-feed compatibility.

## User Experience

### Page structure

The home page becomes a single vertically scrolling editorial feed:

1. A compact top header area.
2. A top-left category icon button that opens the category chooser.
3. Optional search entry on the top-right if it still fits the current app pattern cleanly.
4. A vertical sequence of content sections rendered in API order.

### Section presentation

#### Hero section

If a top-level section has `cardMode="1"`:

- Use only `childList[0]`.
- Render it as a full-width hero card near the top of the page.
- Show the image as the dominant visual surface.
- Overlay the title on the lower portion of the image.
- Optionally include a small category badge using `nodeInfo.name`.
- Clicking the hero opens the associated news detail page.

#### Standard sections

For every other included section:

- Render a section heading using the top-level `name`.
- Render each child item using the same reading-oriented list style currently used by `NewsCard`.
- Keep article cards tappable and routed to the existing detail page flow.

### Category chooser

The category chooser remains available from a top-left icon:

- Tapping the icon opens an overlay panel or compact drawer.
- The panel uses the existing category source, not the homepage JSON.
- Selecting a category routes to the existing `/category/:id` page.
- Closing the chooser returns the user to the same home-feed scroll position.

## Data Source

## Homepage source

The new home feed reads from the Sixth Tone homepage Next.js JSON payload currently represented by:

- `https://www.sixthtone.com/_next/data/<buildId>/index.json`

The implementation should consume:

- `pageProps.data.pageInfo.list`

The payload is nested and card-oriented, so the app needs a normalization layer rather than consuming it directly inside the page component.

## Filtering rules

Before rendering:

- Exclude sections where `nodeInfo.name === "DAILYTONE"`.
- Also exclude sections where top-level `name === "DAILY TONES"` as a defensive fallback.
- Skip sections with an empty or missing `childList`.
- If a `cardMode="1"` section has no valid first child item, skip the hero rendering for that section.

## Routing and navigation

The existing route structure remains:

- `/home` stays the main home-feed route.
- `/category/:id` remains the category list page.
- `/news/:id` remains the article detail page.

The redesign does not change the already-updated app default route behavior:

- `/` redirects to `/daily-tones`
- `/home` is the general homepage/feed route

## Implementation Design

### Proposed file responsibilities

#### New or expanded data layer

- `src/api/homeFeed.ts`
  - Fetch the homepage JSON payload.
  - Normalize top-level sections and child items into app-friendly structures.
  - Apply filtering rules for `DAILY TONES`.

#### Updated page

- `src/pages/CategoryList.tsx`
  - Stop acting as a category grid page.
  - Become the new long-form home-feed container.
  - Manage loading, error, retry, section rendering, and category chooser open state.

#### Optional UI extraction if complexity grows

- `src/components/home/HomeHero.tsx`
  - Render the `cardMode="1"` hero block.
- `src/components/home/HomeSection.tsx`
  - Render a section heading plus article list.
- `src/components/home/HomeCategoryDrawer.tsx`
  - Render the category chooser overlay.

These extractions are optional and should only happen if [src/pages/CategoryList.tsx](C:/Users/14798/Desktop/seventh-tone-news-reader/src/pages/CategoryList.tsx) becomes too large to reason about cleanly.

### Type design

The existing [src/types.ts](C:/Users/14798/Desktop/seventh-tone-news-reader/src/types.ts) types are not enough for the homepage payload because top-level sections contain nested `childList` items and section-level metadata.

The implementation should introduce explicit types for:

- Home feed section
- Home feed article item
- Homepage response envelope

The normalized shape should be small and purpose-built for the home page rather than mirroring the full remote payload.

### Reuse strategy

The redesign should reuse existing behavior where it is already correct:

- Reuse article card styling and article routing behavior from `NewsCard` when rendering standard section items.
- Reuse current category API and category route navigation.
- Reuse existing detail route behavior for tappable article cards.

The redesign should avoid coupling the new home-feed payload to the existing category list API.

## Content handling rules

### Hero behavior

For `cardMode="1"`:

- Use the first child article only.
- Prefer `pic`, then `appHeadPic`.
- Render a dark gradient overlay for title readability.
- Keep text concise on top of the image.

### Standard article behavior

For standard section items:

- Reuse the current list-card layout language.
- Show image, title, summary, author if available, and time label.
- Prefer current news-card time formatting behavior.

### External link edge cases

Some payload items can contain `link` values or non-standard `forwardType` combinations.

First implementation rule:

- Preserve current app behavior for ordinary news items.
- Do not add special-case external-link handling unless a real homepage item fails under current routing assumptions.

This keeps the first version minimal and avoids speculative branching.

## Error handling

The home feed must handle remote instability without crashing:

- Loading state: show a clean skeleton or spinner-based loading view.
- Error state: show a retry affordance.
- Empty state: show a compact empty fallback if all sections are filtered out or invalid.
- Section safety: invalid sections are skipped individually instead of failing the entire page.

## Visual direction

The approved visual tone is an editorial long-form homepage:

- More like a curated magazine front page than a utility dashboard.
- Strong spacing between sections.
- Small uppercase section labels and restrained divider treatments.
- Hero image block for `cardMode="1"` that feels intentional and prominent.
- Standard sections remain familiar and readable by staying close to the existing `NewsCard` visual language.

This keeps the page visually upgraded without creating a disconnected design language inside the app.

## Testing strategy

The implementation should add regression coverage for the new behavior.

Minimum test targets:

- Homepage normalization filters out `DAILY TONES`.
- `cardMode="1"` sections normalize to a single hero item.
- Non-hero sections preserve child article lists.
- The page still exposes a category chooser trigger.
- Category chooser selections still route to `/category/:id`.

Because the current project uses lightweight Node test coverage, tests can focus first on:

- normalization utilities
- source-level structure checks where necessary

## Risks

### Remote payload drift

The Next.js homepage response can change shape over time. Normalization should therefore:

- use defensive optional access
- skip malformed sections
- keep parsing rules narrow and explicit

### File growth in `CategoryList`

If all rendering logic stays in one page file, [src/pages/CategoryList.tsx](C:/Users/14798/Desktop/seventh-tone-news-reader/src/pages/CategoryList.tsx) may become hard to maintain. Component extraction should happen if the page starts carrying both normalization and multiple rendering branches.

### UI inconsistency

If the hero becomes too stylistically different from the rest of the app, the homepage may feel visually detached. The implementation should keep one strong hero moment but preserve the current card language for standard content.

## Acceptance criteria

The redesign is complete when all of the following are true:

- `/home` displays a long scrolling homepage based on the new JSON payload.
- Top-level sections render in API order.
- `cardMode="1"` is rendered as a single hero image card at the section position.
- `DAILY TONES` sections are not rendered on the home page.
- Standard sections render article items in a `NewsCard`-style list presentation.
- A top-left category icon opens a category chooser.
- Category chooser items route to existing `/category/:id` pages.
- Existing news-detail navigation continues to work for home-feed article items.

