import type { Metadata } from "next"
import {
  Bell,
  ClipboardList,
  Download,
  FileText,
  IdCard,
  LayoutDashboard,
  Layers,
  ScrollText,
  Settings,
  UserCheck,
  Users,
} from "lucide-react"

import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV: DashboardNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { href: "/admin/submissions", label: "Submissions", icon: <FileText /> },
  { href: "/admin/registrations", label: "Registrations", icon: <ClipboardList /> },
  { href: "/admin/reviewers", label: "Reviewers", icon: <UserCheck /> },
  { href: "/admin/committee", label: "Committee", icon: <Users /> },
  { href: "/admin/registration-desk", label: "Registration Desk", icon: <IdCard /> },
  { href: "/admin/subthemes", label: "Subthemes", icon: <Layers /> },
  { href: "/admin/conference", label: "Conference", icon: <Settings /> },
  { href: "/admin/notifications", label: "Notifications", icon: <Bell /> },
  { href: "/admin/exports", label: "Exports", icon: <Download /> },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: <ScrollText /> },
]

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole("admin")

  return (
    <DashboardShell
      nav={NAV}
      homeHref="/admin/dashboard"
      portalLabel="Admin"
      userName={`${session.profile.first_name} ${session.profile.last_name}`}
      roleLabel={session.profile.role === "super_admin" ? "Super Admin" : "Admin"}
    >
      {children}
    </DashboardShell>
  )
}
