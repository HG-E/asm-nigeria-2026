# Dashboard UI/UX redesign — sidebar shell + shared primitives (Phase 1: Admin)

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

**Status: Phase 1 (admin portal) shipped and live.** Author, committee,
reviewer, and registration-desk portals are the next increments, pending
go-ahead.

**Status: in progress.**
