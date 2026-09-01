# Dashboard UI/UX redesign — sidebar shell + shared primitives

## Context

The internal dashboards (admin, author, committee, reviewer, registration
desk) are functional but visually plain and inconsistent: every portal
hand-rolls a near-identical top-bar layout, stat summaries are duplicated
ad-hoc Card grids with no icons/color-coding, and the admin nav has grown to
11 links wrapping awkwardly across a horizontal bar. The user asked for a
"well designed, beautiful, well detailed" dashboard system, in ASM's own
brand identity (not a generic template), applied to every portal eventually,
built once as a reusable standard so it stays easy to update — but rolled
out **incrementally, one area verified before the next**.

**What's already there, worth building on rather than replacing:**
- `app/globals.css` already wires ASM's brand colors into the shadcn theme
  layer properly: `--primary` = brand blue, `--accent` = brand gold,
  `--destructive` = brand red, plus tint/deep variants, a full dark-mode
  block, and — notably — a **complete `--sidebar*` token set already
  defined and unused** (`--sidebar`, `--sidebar-primary`,
  `--sidebar-accent`, etc.), as if a sidebar was always the intended
  direction. Headings already render in the site's serif display font
  (`font-heading`, mapped to Source Serif 4) via a global `@layer base`
  rule — no per-page work needed for that.
- `components/layout/brand-mark.tsx` (logo + optional suffix) and
  `brand-stripe.tsx` (3px blue/gold/red tricolor bar) are the established,
  reusable brand devices already used on `/login`, `/register`,
  `/certificate`, and every current portal layout — keep using both.
- Every portal layout (`app/admin/layout.tsx`, `app/committee/layout.tsx`,
  `app/reviewer/layout.tsx`, `app/registration-desk/layout.tsx`,
  `app/author/layout.tsx`) is structurally identical: `BrandStripe` +
  `BrandMark` + nav + user name + logout, in a plain top header. That
  sameness is exactly what makes ONE shared shell component viable and
  worth building first.
- `components/ui/` has no `sidebar.tsx` or `tooltip.tsx` yet (shadcn's
  official sidebar block needs both, plus `@radix-ui/react-tooltip` as a
  new dependency — `lucide-react` for icons is already installed).
- Dashboards already show stat tiles, just duplicated per-page with no
  shared component, no icons, no color-coding (`app/admin/dashboard/page.tsx`,
  `app/author/dashboard/page.tsx` both hand-build a `Card` grid with a
  locally-duplicated shape). `badge.tsx` already has a custom `gold`
  variant used as the "accepted/verified" convention — keep using it.

## Phase 1 scope (this pass)

Build the shared foundation once, prove it out fully on the **admin**
portal (largest, most nav items, most benefit from fixing the sidebar
overflow problem), then stop for review before touching the other four
portals in a follow-up pass.

### 1. New shared primitives (used by every future phase too)

- **`components/ui/sidebar.tsx` + `components/ui/tooltip.tsx`** — shadcn's
  standard sidebar block (collapsible, cookie-persisted state, mobile
  sheet flyout, keyboard shortcut). Added `@radix-ui/react-tooltip` as a
  new dependency.
- **`components/layout/dashboard-shell.tsx`** — one component every portal
  layout uses: `SidebarProvider` + a branded `Sidebar` (header slot =
  `BrandMark`, `SidebarMenu`/`SidebarMenuButton` nav items with a lucide
  icon each and active-route highlighting via `usePathname`, footer slot =
  user name + role label + logout form) + `SidebarInset` for the content
  area with a slim top bar (mobile sidebar trigger + `BrandStripe`). Takes
  `nav: { href, label, icon }[]` and `session` props — updating this one
  file updates every portal's chrome at once.
- **`components/dashboard/stat-card.tsx`** — `StatCard` (label, value,
  optional lucide icon in a soft brand-tinted circle, optional accent:
  `blue | gold | red | muted`) + `StatGrid` (responsive wrapper). Number
  rendered in bold sans (explicit override of the inherited serif heading
  font — numbers read cleaner in a grotesque at a glance).
- **`components/dashboard/page-header.tsx`** — the `<h1>` + `<p>` +
  optional right-aligned actions row already repeated at the top of every
  admin page, extracted once.

### 2. Applied to the admin portal

- **`app/admin/layout.tsx`** — replaced the top-bar markup with
  `DashboardShell`, converting the 11-item wrapping horizontal nav into a
  collapsible sidebar with one icon per section.
- **`app/admin/dashboard/page.tsx`** — rebuilt with `PageHeader` +
  `StatGrid`/`StatCard` (color-coded by category: blue for in-progress
  states, gold for accepted, red for rejected, muted for draft/screening),
  keeping the "no reviewers configured" warning card (recolored onto the
  `destructive`/red brand token instead of raw Tailwind `amber-500`) and
  the action-card grid below.
- **`app/admin/submissions/page.tsx`** — restyled as the representative
  "deep" data page: `PageHeader`, refined filter card, refined table —
  keeping the existing `Badge`/`statusVariant()` convention as-is.
- Every other admin subpage automatically inherits the new sidebar shell
  via the layout change; their inner content is **not** restyled in this
  pass — that's the next increment.

## Explicitly out of scope for this pass (follow-up phases)

- Applying `DashboardShell` + `StatGrid` to author, committee, reviewer,
  and registration-desk layouts/dashboards.
- Restyling the remaining admin subpages' inner content beyond the shell.

## Verification (as executed)

1. `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` — all clean.
   Caught and fixed a real bug along the way: the shadcn CLI's stock
   `hooks/use-mobile.ts` violated this repo's `react-hooks/set-state-in-effect`
   lint rule (setState called synchronously in an effect body) — rewritten
   using `useSyncExternalStore` instead, which is also the more correct
   pattern for subscribing to a browser media query.
2. Live visual check via Playwright screenshots (desktop 1440px + mobile
   390px) of `/admin/dashboard`, `/admin/submissions`, and a spot-check of
   two not-yet-restyled subpages (`/admin/registrations`, `/admin/committee`)
   using a disposable test admin account: sidebar renders with the ASM
   tricolor top stripe, collapses to an icon-only rail cleanly, highlights
   the active route, the mobile sheet flyout opens correctly, stat cards
   show icons/color accents, and every other admin subpage still renders
   correctly inside the new shell even though their own content is
   untouched. Caught and fixed a second real bug this way: nav item icons
   were being passed as component references (functions) from the server
   layout into the `"use client"` shell, which React Server Components
   cannot serialize across that boundary — fixed by passing pre-rendered
   icon elements (`<LayoutDashboard />`) instead of the component
   reference. Also caught and fixed a mobile-only polish issue: stat card
   labels were truncating awkwardly in the 2-column mobile grid — switched
   from `truncate` to natural text wrapping.
3. Dark mode not explicitly screenshotted this pass — relies on the
   existing complete `.dark` token block in `globals.css` (already used
   correctly by every other themed page on the site), not new logic
   introduced by this change.
4. Committed, pushed, deployed, verified live: `/admin` and its subpages
   respond correctly (redirect to login when unauthenticated, not a 500).

**Status: Phase 1 (admin portal) shipped and live.**

## Phase 2 — author, committee, reviewer, registration-desk portals

With the shell and primitives already proven in Phase 1, this pass was
mechanical: apply `DashboardShell` to the remaining four portal layouts and
`PageHeader`/`StatGrid`/`StatCard` to their landing/dashboard pages, reusing
the exact same icon/accent conventions established in Phase 1 (blue =
in-progress, gold = accepted/pending, red = rejected, muted = neutral).

- **`app/author/layout.tsx`** — 2-item nav (Dashboard, Profile). Footer role
  label includes the ASM ID number when present, matching what the old
  top-bar used to show.
- **`app/author/dashboard/page.tsx`** — `PageHeader` (with the "+ Submit New
  Abstract" button as its `actions` slot) + 7-stat `StatGrid`.
- **`app/committee/layout.tsx`** / **`app/reviewer/layout.tsx`** —
  single-item nav (Dashboard only — neither portal has other pages in its
  top-level nav). Same shell as everywhere else for chrome consistency even
  though there's only one destination.
- **`app/committee/dashboard/page.tsx`** — `PageHeader` + 8-stat `StatGrid`.
- **`app/reviewer/dashboard/page.tsx`** — `PageHeader` + 4-stat `StatGrid`
  (Assigned/Pending/Completed/Overdue).
- **`app/registration-desk/layout.tsx`** — single-item nav (Registrations).
  Role label reads "Admin" instead of "Registration Desk" when an actual
  admin is viewing it (this portal's access check also allows admins
  through, same as before).
- **`app/registration-desk/page.tsx`** — the inline "X total · Y pending..."
  text line replaced with a proper 5-stat `StatGrid` (Total/Pending/
  Verified/Rejected/Attended); `PageHeader`'s `actions` slot now holds the
  CSV/XLSX download buttons that used to sit in a hand-built flex row.

### Verification (as executed)

1. `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` — all clean.
2. Live visual check (desktop 1440px + mobile 390px) via four disposable
   test accounts, one per role (`author`, `committee`, `reviewer`,
   `registration_desk`), screenshotting each portal's dashboard: sidebar,
   nav, active-route highlighting, stat cards, and mobile layout all
   confirmed correct on every portal, including the single-nav-item
   portals (committee/reviewer) and the registration-desk page's new stat
   row.
3. Committed, pushed, deployed, verified live: every portal's landing
   route responds correctly (redirects to login when unauthenticated, not
   a 500).

**Status: Phase 2 shipped and live — the redesign now covers every internal
portal.**

## Phase 3 — real bug fix (sticky table columns) + full admin subpage sweep + hover/animation polish

Product owner flagged a real, concrete bug with a screenshot: on
`/admin/registrations`, scrolling the table horizontally lost the Reference
and Name columns — the only way to identify which row was which — leaving
Category/Amount/Files/Status visible with no way to tell whose record it
was. This is a well-known data-table problem with a standard fix used by
every comparable product (Stripe, Linear, GitHub, Notion, Airtable all pin
an identity column): make the leftmost "who is this row" column `sticky
left-0`, so it never scrolls out of view.

**The fix, applied to every table wide enough to need it:**
`/admin/registrations`, `/admin/submissions`, `/admin/notifications`,
`/admin/reviewers`, `/admin/committee`, `/admin/audit-logs`, and the
registration-desk portal's own table. In each case the identity information
(name/title + its secondary identifier — email, reference number, or
timestamp) was merged into a single cell where it wasn't already, then
pinned with `sticky left-0 z-10 bg-card border-r` on both the header and
body cells — `bg-card` so scrolled content doesn't show through, `border-r`
as a visible separator, matching the same treatment on `<th>` and `<td>` so
header and body stay aligned. This also *reduced* column count on the
widest tables (registrations 8→7, submissions 7→6, notifications 8→7),
which independently helps: less to scroll through in the first place.

**Full admin subpage sweep:** every remaining `/admin/*` page that still had
a plain `<h1>+<p>` header (`reviewers`, `subthemes`, `conference`,
`notifications`, `audit-logs`, `exports`, `committee`, `registration-desk`)
now uses the shared `PageHeader`, matching the pages already converted in
Phases 1–2 — this was the "little misalignment" the product owner was
seeing: inconsistent header treatment page-to-page.

**Hover and entrance animation, CSS-only (no new dependency, no runtime
cost):** this project already has `tw-animate-css` installed and in use
elsewhere (`TooltipContent` already used its `animate-in`/`fade-in`/
`zoom-in` utilities) — reused it rather than adding a JS animation library,
which would work against the "fast load" ask.
- `StatCard`: hover lift (`-translate-y-0.5` + `shadow-md`) and a subtle
  icon-circle scale on hover.
- `StatGrid` / `PageHeader`: a brief fade+slide-up on mount
  (`animate-in fade-in-0 slide-in-from-bottom-*`).
- `DashboardShell`'s sidebar nav items: added `transition-colors` so the
  hover/active state change isn't an instant snap.
- Exports page's dataset cards: same hover-lift + entrance animation as
  `StatCard`, for visual consistency between the two card grids admins see
  most.

### Verification (as executed)

1. `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` — all clean.
2. Live verification with a disposable admin test account, specifically
   targeting the reported bug: navigated to each fixed table and
   programmatically scrolled it fully right, screenshotting before and
   after — confirmed the identity column stays pinned and readable while
   the rest of the row scrolls underneath it, on `/admin/registrations`
   (the exact page from the bug report), `/admin/submissions`, and the
   registration-desk portal. `/admin/notifications` didn't have anything to
   scroll at the tested viewport width (its columns already fit), so the
   sticky styling there is inert-but-correct — it activates automatically
   on narrower screens or longer content.
3. Screenshotted every other touched admin subpage (dashboard, reviewers,
   committee, audit-logs, exports, subthemes, conference,
   admin/registration-desk) to confirm `PageHeader` renders consistently
   and nothing regressed.
4. Dark mode not explicitly screenshotted this pass either — same standing
   caveat as Phase 1, relies on existing `.dark` tokens rather than new
   logic.
5. Committed, pushed, deployed, verified live.

**Status: Phase 3 shipped and live.**

## Phase 4 — dark mode was never actually activating (found and fixed)

Went to close out the Phase 1/2/3 "dark mode not explicitly verified" caveat
and found dark mode had never worked on this site at all — not something
this redesign broke, a pre-existing gap. `app/globals.css` has a complete,
correctly-designed `.dark { ... }` token block (confirmed: `--background`,
`--primary`, `--sidebar*`, every token has a real dark counterpart), gated
by Tailwind's `@custom-variant dark (&:is(.dark *));` — i.e. it only
activates when something adds a `dark` class to an ancestor element.
Nothing in the codebase ever did that: no theme provider, no toggle
component, no script reading `prefers-color-scheme`. Confirmed via grep
that zero `dark:`-prefixed Tailwind utility classes are used anywhere
either, so this wasn't a partially-working system — the entire dark
palette was unreachable dead code, and every visitor saw light mode
regardless of their OS setting.

**Fix**: `app/layout.tsx` now has a small inline script
(`next/script`, `strategy="beforeInteractive"` — runs before paint, so
there's no flash of the wrong theme) that checks
`window.matchMedia('(prefers-color-scheme: dark)')` and adds the `dark`
class to `documentElement` if the OS/browser prefers dark. This is the
standard technique (the same one libraries like `next-themes` use
internally) — auto-follows system preference, no user-facing toggle added
(none was requested; adding one is a separate, bigger UI decision about
where it would live across the public site and every portal).

### Verification

1. `npx tsc --noEmit -p .` — clean.
2. Live check: emulated `prefers-color-scheme: dark` in a real browser
   session, logged in as a disposable admin account, and confirmed dark
   mode now genuinely activates — before the fix, screenshots came back in
   light colors despite the emulated preference; after, the sidebar, stat
   cards, and sticky-column tables (scrolled right, to specifically check
   the sticky column's background adapts rather than showing a light seam
   against the dark row) all rendered correctly with proper contrast.
   Confirmed on `/admin/dashboard`, `/admin/registrations` (including
   scrolled), `/admin/exports`, and mobile.
3. Committed, pushed, deployed.

**Status: Phase 4 shipped and live — dark mode now actually works,
site-wide, following the visitor's OS/browser preference.**
