"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Slide = {
  kicker: string
  headline: string
  quote?: string
  body: string
  illustration: "triad" | "diatoms" | "colonies"
}

function OneHealthTriad() {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <circle cx="160" cy="150" r="110" fill="var(--brand-blue)" style={{ mixBlendMode: "multiply" }} />
      <circle cx="240" cy="150" r="110" fill="var(--brand-gold)" style={{ mixBlendMode: "multiply" }} />
      <circle cx="200" cy="230" r="110" fill="var(--brand-red)" style={{ mixBlendMode: "multiply" }} />
    </svg>
  )
}

function Diatoms() {
  // Abstract diatom/microorganism cluster, in the spirit of ASM's own
  // microscopy-illustration marketing -- simple radial dot rings, not
  // photography or a literal species rendering.
  const rings = [
    { cx: 130, cy: 130, r: 78, color: "var(--brand-blue)", dots: 14 },
    { cx: 270, cy: 200, r: 58, color: "var(--brand-gold)", dots: 10 },
    { cx: 190, cy: 280, r: 44, color: "var(--brand-red)", dots: 8 },
  ]
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      {rings.map((ring, i) => (
        <g key={i} style={{ mixBlendMode: "multiply" }}>
          <circle cx={ring.cx} cy={ring.cy} r={ring.r} fill={ring.color} opacity={0.5} />
          {Array.from({ length: ring.dots }).map((_, d) => {
            const angle = (d / ring.dots) * Math.PI * 2
            const x = ring.cx + Math.cos(angle) * ring.r * 0.62
            const y = ring.cy + Math.sin(angle) * ring.r * 0.62
            return <circle key={d} cx={x} cy={y} r={ring.r * 0.07} fill={ring.color} opacity={0.8} />
          })}
        </g>
      ))}
    </svg>
  )
}

function Colonies() {
  // Bacterial rod/coccus cluster -- a tight, overlapping colony rather than
  // scattered specimens, so it reads as one cohesive motif at hero scale.
  const shapes = [
    { x: 155, y: 230, w: 130, h: 62, rot: -22, color: "var(--brand-blue)" },
    { x: 235, y: 175, w: 96, h: 96, rot: 0, color: "var(--brand-gold)", round: true },
    { x: 195, y: 145, w: 150, h: 66, rot: 14, color: "var(--brand-red)" },
    { x: 130, y: 165, w: 84, h: 84, rot: 0, color: "var(--brand-blue)", round: true },
    { x: 245, y: 260, w: 78, h: 78, rot: 0, color: "var(--brand-red)", round: true },
  ]
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      {shapes.map((s, i) => (
        <g key={i} style={{ mixBlendMode: "multiply" }} opacity={0.65}>
          {s.round ? (
            <circle cx={s.x} cy={s.y} r={s.w / 2} fill={s.color} />
          ) : (
            <rect
              x={s.x - s.w / 2}
              y={s.y - s.h / 2}
              width={s.w}
              height={s.h}
              rx={s.h / 2}
              fill={s.color}
              transform={`rotate(${s.rot} ${s.x} ${s.y})`}
            />
          )}
        </g>
      ))}
    </svg>
  )
}

const ILLUSTRATIONS = { triad: OneHealthTriad, diatoms: Diatoms, colonies: Colonies }

export function HeroCarousel({
  slides,
  eyebrow,
  dateBadge,
  locationBadge,
}: {
  slides: Slide[]
  eyebrow: string
  dateBadge: string | null
  locationBadge: string | null
}) {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (slides.length <= 1) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length)
    }, 6000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [slides.length])

  function goTo(i: number) {
    setActive(i)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const slide = slides[active]
  const Illustration = ILLUSTRATIONS[slide.illustration]

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-[0.16] blur-[2px] transition-opacity duration-700 sm:opacity-[0.22]"
        key={active}
      >
        <Illustration />
      </div>

      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        <span className="bg-brand-blue h-[3px] w-8 rounded-full" />
        <span className="bg-brand-gold h-[3px] w-8 rounded-full" />
        <span className="bg-brand-red h-[3px] w-8 rounded-full" />
      </div>
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{eyebrow}</p>

      <div className="min-h-[11rem] sm:min-h-[9.5rem]">
        <p key={`kicker-${active}`} className="text-brand-blue-deep animate-in fade-in slide-in-from-bottom-1 text-sm font-semibold tracking-wide uppercase duration-500">
          {slide.kicker}
        </p>
        <h1
          key={`headline-${active}`}
          className="animate-in fade-in slide-in-from-bottom-2 mt-2 text-3xl font-semibold tracking-tight text-balance duration-500 sm:text-4xl"
        >
          {slide.headline}
        </h1>
        {slide.quote && (
          <p key={`quote-${active}`} className="text-brand-blue-deep animate-in fade-in mx-auto mt-3 max-w-xl text-balance text-lg font-medium italic duration-600">
            &ldquo;{slide.quote}&rdquo;
          </p>
        )}
        <p
          key={`body-${active}`}
          className="text-muted-foreground animate-in fade-in mx-auto mt-3 max-w-xl text-balance duration-700"
        >
          {slide.body}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {dateBadge && (
          <Badge variant="secondary" className="py-1">
            {dateBadge}
          </Badge>
        )}
        {locationBadge && (
          <Badge variant="secondary" className="py-1">
            {locationBadge}
          </Badge>
        )}
      </div>

      <div className="flex flex-col justify-center gap-3 pt-1 sm:flex-row">
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          Register as an author
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Log in
        </Link>
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2" role="tablist" aria-label="Hero highlights">
          {slides.map((s, i) => (
            <button
              key={s.headline}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={s.kicker}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "bg-brand-blue w-6" : "bg-border w-1.5 hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
