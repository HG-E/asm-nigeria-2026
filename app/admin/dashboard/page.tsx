import Link from "next/link"
import {
  CheckCheck,
  CircleCheck,
  ClipboardList,
  Clock,
  Inbox,
  Layers,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

export default async function AdminDashboardPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: submissions } = await supabase.from("submissions").select("status")
  const rows = submissions ?? []

  const count = (statuses: SubmissionStatus[]) => rows.filter((r) => statuses.includes(r.status)).length

  // Each stat links straight into /admin/submissions pre-filtered to the
  // statuses it counts, so the number is a shortcut to the work behind it
  // instead of a dead-end count -- the same "click a stat, land on the
  // filtered list" convention every real triage dashboard uses (Linear,
  // Jira, EasyChair, HotCRP).
  const summary: { label: string; value: number; icon: typeof Layers; accent: StatAccent; href: string }[] = [
    { label: "Total", value: rows.length, icon: Layers, accent: "muted", href: "/admin/submissions" },
    { label: "Submitted", value: count(["submitted"]), icon: Inbox, accent: "blue", href: "/admin/submissions?status=submitted" },
    { label: "Screening", value: count(["screening"]), icon: Search, accent: "blue", href: "/admin/submissions?status=screening" },
    {
      label: "Under review",
      value: count(["assigned", "under_review"]),
      icon: ClipboardList,
      accent: "blue",
      href: "/admin/submissions?status=assigned,under_review",
    },
    {
      label: "Reviews completed",
      value: count(["reviews_completed"]),
      icon: CheckCheck,
      accent: "blue",
      href: "/admin/submissions?status=reviews_completed",
    },
    {
      label: "Decision pending",
      value: count(["decision_pending"]),
      icon: Clock,
      accent: "gold",
      href: "/admin/submissions?status=decision_pending",
    },
    {
      label: "Accepted",
      value: count(["accepted", "accepted_oral", "accepted_poster"]),
      icon: CircleCheck,
      accent: "gold",
      href: "/admin/submissions?status=accepted,accepted_oral,accepted_poster",
    },
    {
      label: "Revision required",
      value: count(["revision_required"]),
      icon: RotateCcw,
      accent: "muted",
      href: "/admin/submissions?status=revision_required",
    },
    { label: "Rejected", value: count(["rejected"]), icon: XCircle, accent: "red", href: "/admin/submissions?status=rejected" },
  ]

  const { count: reviewerCount } = await supabase
    .from("reviewer_profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Dashboard" description="ASM Nigeria 2026 conference overview." />

      {(reviewerCount ?? 0) === 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">No reviewers configured yet</CardTitle>
            <CardDescription>
              Submissions cannot be routed for review until reviewers are added.{" "}
              <Link href="/admin/reviewers" className="underline underline-offset-4">
                Add reviewers
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <StatGrid>
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} href={s.href} />
        ))}
      </StatGrid>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Manage Submissions", "/admin/submissions", "Search, filter, and view all submissions."],
          ["Manage Reviewers", "/admin/reviewers", "Add and manage scientific reviewers."],
          ["Manage Committee", "/admin/committee", "Add scientific committee members."],
          ["Manage Subthemes", "/admin/subthemes", "Edit conference subthemes."],
          ["Conference Settings", "/admin/conference", "Dates, deadlines, word limit, file rules."],
        ].map(([title, href, desc]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
