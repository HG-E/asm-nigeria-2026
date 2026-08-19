import Link from "next/link"
import { ClipboardCheck, FileSearch, Gavel, ShieldCheck, UploadCloud } from "lucide-react"

import { HeroCarousel } from "@/components/marketing/hero-carousel"
import { Reveal } from "@/components/marketing/reveal"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

function formatDate(iso: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...opts,
  })
}

function formatDateRange(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return null
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    const month = start.toLocaleDateString("en-US", { month: "long" })
    return `${month} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`
}

const PROCESS_STEPS = [
  {
    icon: UploadCloud,
    title: "Submit",
    body: "Register, write your abstract, declare conflicts and ethics, and upload your document and payment receipt — one guided flow.",
  },
  {
    icon: ShieldCheck,
    title: "Double-blind review",
    body: "Scientific reviewers assigned to your subtheme score the work on its merits alone — your identity stays hidden from them throughout.",
  },
  {
    icon: Gavel,
    title: "Committee decision",
    body: "The Scientific Committee weighs reviewer recommendations and makes the final call — accept, request revision, or decline.",
  },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: conference } = await supabase
    .from("conferences")
    .select("*")
    .eq("is_active", true)
    .maybeSingle()

  const { data: subthemesRaw } = conference
    ? await supabase
        .from("conference_subthemes")
        .select("name, code, description")
        .eq("conference_id", conference.id)
        .eq("is_active", true)
        .order("sort_order")
    : { data: null }

  const subthemes = (subthemesRaw ?? []).map((s) => {
    const [intro] = (s.description ?? "").split("\n\nTopics include:")
    return { ...s, intro: intro?.trim() || s.description }
  })

  const dateRange = formatDateRange(conference?.start_date ?? null, conference?.end_date ?? null)

  const milestones = [
    { label: "Early submission deadline", date: conference?.early_submission_deadline ?? null },
    { label: "Late submission deadline", date: conference?.late_submission_deadline ?? null },
    { label: "Review deadline", date: conference?.review_deadline ?? null },
    { label: "Decision date", date: conference?.decision_date ?? null },
  ].filter((m) => m.date)

  const heroSlides = [
    {
      kicker: conference?.tagline ? `"${conference.tagline}"` : "Welcome",
      headline: conference?.name ?? "ASM Nigeria 2026",
      body:
        conference?.theme ??
        "A gathering for microbiologists working across human, animal, and environmental health.",
      illustration: "triad" as const,
    },
    {
      kicker: "Built by scientists, for scientists",
      headline: "Your research, read on its merits",
      body: "From antimicrobial resistance to AI-driven diagnostics, this is where Nigeria's microbiologists — early-career and senior alike — bring their best work to a rigorous, welcoming stage.",
      illustration: "diatoms" as const,
    },
    {
      kicker: "Reviewed blind, decided by committee",
      headline: "Good science speaks for itself here",
      body: "Every abstract is read double-blind by scientists in your subtheme before a decision is ever made — your identity stays hidden from reviewers throughout.",
      illustration: "colonies" as const,
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--brand-blue) 8%, transparent), transparent)",
          }}
        />
        <HeroCarousel
          slides={heroSlides}
          eyebrow={`${conference?.short_name ?? "ASM Nigeria 2026"}${conference?.location ? ` · ${conference.location}` : ""}`}
          dateBadge={dateRange}
          locationBadge={conference?.location ?? null}
        />
      </section>

      {/* Key dates */}
      {milestones.length > 0 && (
        <section className="border-y">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Reveal>
              <h2 className="text-center text-2xl font-semibold">Key dates</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {milestones.map((m, i) => (
                <Reveal key={m.label} delay={i * 80}>
                  <div className="space-y-1 text-center">
                    <p className="text-brand-blue font-heading text-2xl font-semibold text-balance">
                      {formatDate(m.date, { year: undefined })}
                    </p>
                    <p className="text-muted-foreground text-sm text-balance">{m.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold">How submission works</h2>
          <p className="text-muted-foreground mt-2 text-balance">
            Three steps between a first draft and a decision — every abstract goes through the
            same process, reviewed on scientific merit alone.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <Card className="h-full">
                <CardContent className="space-y-3">
                  <div className="bg-brand-blue-tint text-brand-blue flex size-10 items-center justify-center rounded-full">
                    <step.icon className="size-5" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.body}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
        {(conference?.submission_fee_ngn || conference?.abstract_word_limit) && (
          <Reveal delay={250}>
            <p className="text-muted-foreground mt-8 text-center text-sm">
              {conference?.abstract_word_limit && (
                <>Abstracts up to {conference.abstract_word_limit} words. </>
              )}
              {conference?.submission_fee_ngn && (
                <>
                  Submission fee ₦{Number(conference.submission_fee_ngn).toLocaleString()}
                  {conference?.submission_fee_usd ? ` (or $${conference.submission_fee_usd})` : ""} per
                  abstract.
                </>
              )}
            </p>
          </Reveal>
        )}
      </section>

      {/* Subthemes */}
      {subthemes.length > 0 && (
        <section className="border-t">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold">Scientific subthemes</h2>
              <p className="text-muted-foreground mt-2 text-balance">
                Every abstract is submitted under one of these five subthemes, which also
                determines who reviews it.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {subthemes.map((s, i) => (
                <Reveal key={s.code} delay={i * 80}>
                  <Card className="h-full">
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono">{s.code}</Badge>
                      </div>
                      <h3 className="font-heading text-lg leading-snug font-semibold text-balance">
                        {s.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">{s.intro}</p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="px-4 py-20 text-center">
        <Reveal className="mx-auto max-w-xl space-y-5">
          <FileSearch className="text-brand-gold mx-auto size-8" aria-hidden />
          <h2 className="text-2xl font-semibold text-balance">Ready to share your research?</h2>
          <p className="text-muted-foreground text-balance">
            {conference?.submissions_open
              ? "Submissions are open. Create an account and submit your abstract in under fifteen minutes."
              : "Create an account now to be ready when submissions open."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              <ClipboardCheck className="size-4" />
              Submit an abstract
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Log in
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {conference?.name ?? "ASM Nigeria 2026"}
            {conference?.venue ? ` · ${conference.venue}` : ""}
          </p>
          <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1")}>
            {conference?.secretariat_email && (
              <a href={`mailto:${conference.secretariat_email}`} className="hover:text-foreground">
                {conference.secretariat_email}
              </a>
            )}
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
