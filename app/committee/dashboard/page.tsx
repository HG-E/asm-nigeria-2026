import Link from "next/link"
import {
  CheckCheck,
  CircleCheck,
  ClipboardList,
  Clock,
  Layers,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
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

  const summary: { label: string; value: number; icon: typeof Layers; accent: StatAccent }[] = [
    { label: "Total", value: rows.length, icon: Layers, accent: "muted" },
    { label: "Pending screening", value: count(["submitted", "screening"]), icon: Search, accent: "blue" },
    { label: "Under review", value: count(["assigned", "under_review"]), icon: ClipboardList, accent: "blue" },
    { label: "Reviews completed", value: count(["reviews_completed"]), icon: CheckCheck, accent: "blue" },
    { label: "Decision pending", value: count(["decision_pending"]), icon: Clock, accent: "gold" },
    { label: "Accepted", value: count(["accepted", "accepted_oral", "accepted_poster"]), icon: CircleCheck, accent: "gold" },
    { label: "Revision required", value: count(["revision_required"]), icon: RotateCcw, accent: "muted" },
    { label: "Rejected", value: count(["rejected"]), icon: XCircle, accent: "red" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scientific Committee Dashboard"
        description="ASM Nigeria 2026 — review outcomes and final decisions."
      />

      <StatGrid>
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </StatGrid>

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
