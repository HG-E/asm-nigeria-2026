import type { Metadata } from "next"
import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { BrandStripe } from "@/components/layout/brand-stripe"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/reviewers", label: "Reviewers" },
  { href: "/admin/committee", label: "Committee" },
  { href: "/admin/registration-desk", label: "Registration Desk" },
  { href: "/admin/subthemes", label: "Subthemes" },
  { href: "/admin/conference", label: "Conference" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
]

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole("admin")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <BrandStripe />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark href="/admin/dashboard" suffix="Nigeria 2026 · Admin" />
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
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
