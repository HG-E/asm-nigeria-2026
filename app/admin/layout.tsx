import Link from "next/link"

import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth"

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/reviewers", label: "Reviewers" },
  { href: "/admin/committee", label: "Committee" },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin/dashboard" className="font-semibold">
            ASM Nigeria 2026 &middot; Admin
          </Link>
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
