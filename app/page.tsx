import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const { data: conference } = await supabase
    .from("conferences")
    .select("short_name, location, tagline")
    .eq("is_active", true)
    .maybeSingle()

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 8%, color-mix(in oklab, var(--brand-blue) 10%, transparent), transparent), radial-gradient(45% 40% at 85% 85%, color-mix(in oklab, var(--brand-gold) 12%, transparent), transparent)",
        }}
      />
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          <span className="bg-brand-blue h-[3px] w-8 rounded-full" />
          <span className="bg-brand-gold h-[3px] w-8 rounded-full" />
          <span className="bg-brand-red h-[3px] w-8 rounded-full" />
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          {conference?.short_name ?? "ASM Nigeria 2026"}
          {conference?.location ? ` · ${conference.location}` : ""}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Abstract Management System
        </h1>
        {conference?.tagline && (
          <p className="text-brand-blue-deep text-balance text-lg font-medium italic">
            &ldquo;{conference.tagline}&rdquo;
          </p>
        )}
        <p className="text-muted-foreground text-balance">
          Submit, track, and review conference abstracts for {conference?.short_name ?? "ASM Nigeria 2026"}.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Register as an author
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
