import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl space-y-6">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          ASM Nigeria 2026 &middot; Abuja
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Abstract Management System
        </h1>
        <p className="text-muted-foreground text-balance">
          Submit, track, and review conference abstracts for ASM Nigeria 2026.
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
