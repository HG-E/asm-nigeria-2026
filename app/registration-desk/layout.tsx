import type { Metadata } from "next"

import { BrandMark } from "@/components/layout/brand-mark"
import { BrandStripe } from "@/components/layout/brand-stripe"
import { Button } from "@/components/ui/button"
import { requireRegistrationAccess } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function RegistrationDeskLayout({ children }: LayoutProps<"/registration-desk">) {
  const session = await requireRegistrationAccess()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <BrandStripe />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark href="/registration-desk" suffix="Nigeria 2026 · Registration Desk" />
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden lg:inline">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
