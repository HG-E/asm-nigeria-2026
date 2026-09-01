import type { Metadata } from "next"
import { LayoutDashboard } from "lucide-react"

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV: DashboardNavItem[] = [
  { href: "/reviewer/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
]

export default async function ReviewerLayout({ children }: LayoutProps<"/reviewer">) {
  const session = await requireRole("reviewer")

  return (
    <DashboardShell
      nav={NAV}
      homeHref="/reviewer/dashboard"
      portalLabel="Reviewer"
      userName={`${session.profile.first_name} ${session.profile.last_name}`}
      roleLabel="Reviewer"
    >
      {children}
    </DashboardShell>
  )
}
