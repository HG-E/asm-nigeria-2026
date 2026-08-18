import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

export default async function CommitteeDashboardPage() {
  await requireRole("committee")
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, reference_number, title, status, conference_subthemes(name)")
    .not("status", "eq", "draft")
    .order("created_at", { ascending: false })

  const rows = submissions ?? []
  const count = (statuses: SubmissionStatus[]) => rows.filter((r) => statuses.includes(r.status)).length

  const summary = [
    ["Total", rows.length],
    ["Pending screening", count(["submitted", "screening"])],
    ["Under review", count(["assigned", "under_review"])],
    ["Reviews completed", count(["reviews_completed"])],
    ["Decision pending", count(["decision_pending"])],
    ["Accepted", count(["accepted", "accepted_oral", "accepted_poster"])],
    ["Revision required", count(["revision_required"])],
    ["Rejected", count(["rejected"])],
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Scientific Committee Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          ASM Nigeria 2026 — review outcomes and final decisions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summary.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No submissions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.reference_number}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <Link href={`/committee/submissions/${s.id}`} className="hover:underline">
                        {s.title || "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell>{s.conference_subthemes?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
