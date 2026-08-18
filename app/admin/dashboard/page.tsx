import Link from "next/link"

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

  const summary = [
    ["Total", rows.length],
    ["Submitted", count(["submitted"])],
    ["Screening", count(["screening"])],
    ["Under review", count(["assigned", "under_review"])],
    ["Reviews completed", count(["reviews_completed"])],
    ["Decision pending", count(["decision_pending"])],
    ["Accepted", count(["accepted", "accepted_oral", "accepted_poster"])],
    ["Revision required", count(["revision_required"])],
    ["Rejected", count(["rejected"])],
  ] as const

  const { count: reviewerCount } = await supabase
    .from("reviewer_profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          ASM Nigeria 2026 conference overview.
        </p>
      </div>

      {(reviewerCount ?? 0) === 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Manage Submissions", "/admin/submissions", "Search, filter, and view all submissions."],
          ["Manage Reviewers", "/admin/reviewers", "Add and manage the 5 scientific reviewers."],
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
