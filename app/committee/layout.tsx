import type { Metadata } from "next"
import { LayoutDashboard } from "lucide-react"

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV: DashboardNavItem[] = [
  { href: "/committee/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
]

export default async function CommitteeLayout({ children }: LayoutProps<"/committee">) {
  const session = await requireRole("committee")

  return (
    <DashboardShell
      nav={NAV}
      homeHref="/committee/dashboard"
      portalLabel="Committee"
      userName={`${session.profile.first_name} ${session.profile.last_name}`}
      roleLabel="Committee"
    >
      {children}
    </DashboardShell>
  )
}
