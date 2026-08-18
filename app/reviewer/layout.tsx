import Link from "next/link"

import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth"

export default async function ReviewerLayout({ children }: LayoutProps<"/reviewer">) {
  const session = await requireRole("reviewer")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/reviewer/dashboard" className="font-semibold">
            ASM Nigeria 2026 &middot; Reviewer
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden sm:inline">
              {session.profile.first_name} {session.profile.last_name}
            </span>
            <form action="/logout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
