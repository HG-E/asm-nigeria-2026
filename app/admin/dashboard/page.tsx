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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Revisions the committee has to act on: past their deadline, or requested with
// no deadline at all (so nothing would ever flag them as late).
async function getRevisionsNeedingAttention(supabase: SupabaseClient) {
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, reference_number, title")
    .eq("status", "revision_required")
  if (!subs || subs.length === 0) return []

  const { data: decisions } = await supabase
    .from("decisions")
    .select("submission_id, revision_deadline, created_at")
    .in("submission_id", subs.map((s) => s.id))
    .order("created_at", { ascending: false })

  const latest = new Map<string, string | null>()
  for (const d of decisions ?? []) {
    if (!latest.has(d.submission_id)) latest.set(d.submission_id, d.revision_deadline)
  }

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  return subs
    .map((s) => {
      const deadline = latest.get(s.id) ?? null
      const daysLate = deadline ? Math.floor((now - new Date(deadline).getTime()) / day) : null
      return { ...s, deadline, daysLate }
    })
    .filter((s) => !s.deadline || (s.daysLate ?? 0) >= 0)
    .sort((a, b) => (b.daysLate ?? 9999) - (a.daysLate ?? 9999))
}

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

  const attention = await getRevisionsNeedingAttention(supabase)

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

      {attention.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">
              {attention.length} revision{attention.length === 1 ? "" : "s"} need{attention.length === 1 ? "s" : ""} attention
            </CardTitle>
            <CardDescription>Overdue, or requested without a deadline. Extend, set a date, or close them.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {attention.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/submissions/${s.id}`} className="font-medium underline underline-offset-4">
                    {s.reference_number ?? "Draft"}
                  </Link>{" "}
                  — {s.deadline ? `${s.daysLate} day${s.daysLate === 1 ? "" : "s"} overdue` : "no deadline set"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
