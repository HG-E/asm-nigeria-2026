import type { Metadata } from "next"
import { LayoutDashboard, User } from "lucide-react"

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell"
import { requireAuth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV: DashboardNavItem[] = [
  { href: "/author/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { href: "/author/profile", label: "Profile", icon: <User /> },
]

export default async function AuthorLayout({ children }: LayoutProps<"/author">) {
  const session = await requireAuth()

  return (
    <DashboardShell
      nav={NAV}
      homeHref="/author/dashboard"
      portalLabel="Author"
      userName={`${session.profile.first_name} ${session.profile.last_name}`}
      roleLabel={session.profile.asm_id_number ? `Author · ASM ID ${session.profile.asm_id_number}` : "Author"}
    >
      {children}
    </DashboardShell>
  )
}
