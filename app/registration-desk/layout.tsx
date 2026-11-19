import type { Metadata } from "next"
import { ClipboardList, ScanLine } from "lucide-react"

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell"
import { requireRegistrationAccess } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV: DashboardNavItem[] = [
  { href: "/registration-desk", label: "Registrations", icon: <ClipboardList /> },
  { href: "/registration-desk/scan", label: "Scan Check-in", icon: <ScanLine /> },
]

export default async function RegistrationDeskLayout({ children }: LayoutProps<"/registration-desk">) {
  const session = await requireRegistrationAccess()

  return (
    <DashboardShell
      nav={NAV}
      homeHref="/registration-desk"
      portalLabel="Registration Desk"
      userName={`${session.profile.first_name} ${session.profile.last_name}`}
      roleLabel={session.profile.role === "registration_desk" ? "Registration Desk" : "Admin"}
    >
      {children}
    </DashboardShell>
  )
}
