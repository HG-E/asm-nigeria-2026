# ASM Nigeria 2026 — Abstract Management System

Conference abstract registration, submission, review, and decision system for the
ASM Nigeria 2026 conference (Abuja, Nov 22–25 2026). See `Master Build Specification.md`
for the full product spec and `IMPLEMENTATION_PLAN.md` for current state and phased plan.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · Zod + React Hook Form · deployed on Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database tooling

The schema lives in Supabase directly; `supabase/migrations/` captures changes made
against the live project for reproducibility, applied via direct Postgres connection
(no Supabase CLI login or Docker required):

```bash
npm run db:inspect-schema      # dump full column/enum/PK info
npm run db:inspect-policies    # dump RLS policy definitions for two named tables (edit script to change)
npm run db:migrate -- supabase/migrations/000X_name.sql
```

These need `DATABASE_URL` in `.env.local` (Supabase dashboard → Connect → Direct connection string, URI, session pooler).

## Next.js 16 notes for this repo

- `cookies()`, `headers()`, `params`, `searchParams` are async everywhere — always `await`.
- Route gating lives in `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`), not `middleware.ts`.
- Run `npx next typegen` after adding new dynamic routes if `PageProps`/`LayoutProps` helpers go stale.
