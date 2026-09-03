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
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

const FILTERABLE_STATUSES: SubmissionStatus[] = [
  "submitted",
  "screening",
  "assigned",
  "under_review",
  "reviews_completed",
  "decision_pending",
  "revision_required",
  "accepted",
  "accepted_oral",
  "accepted_poster",
  "rejected",
  "withdrawn",
]

export default async function CommitteeDashboardPage(props: PageProps<"/committee/dashboard">) {
  await requireRole("committee")
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const q = typeof searchParams.q === "string" ? searchParams.q : ""
  const status = typeof searchParams.status === "string" ? searchParams.status : ""
  const statusList = status ? status.split(",").filter(Boolean) : []

  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, reference_number, title, status, conference_subthemes(name)")
    .not("status", "eq", "draft")
    .order("created_at", { ascending: false })

  const allRows = allSubmissions ?? []
  const count = (statuses: SubmissionStatus[]) => allRows.filter((r) => statuses.includes(r.status)).length

  // Stat cards jump straight into this same table pre-filtered -- there's
  // no separate committee submissions-list page, this dashboard is it.
  const summary: { label: string; value: number; icon: typeof Layers; accent: StatAccent; href: string }[] = [
    { label: "Total", value: allRows.length, icon: Layers, accent: "muted", href: "/committee/dashboard" },
    {
      label: "Pending screening",
      value: count(["submitted", "screening"]),
      icon: Search,
      accent: "blue",
      href: "/committee/dashboard?status=submitted,screening",
    },
    {
      label: "Under review",
      value: count(["assigned", "under_review"]),
      icon: ClipboardList,
      accent: "blue",
      href: "/committee/dashboard?status=assigned,under_review",
    },
    {
      label: "Reviews completed",
      value: count(["reviews_completed"]),
      icon: CheckCheck,
      accent: "blue",
      href: "/committee/dashboard?status=reviews_completed",
    },
    {
      label: "Decision pending",
      value: count(["decision_pending"]),
      icon: Clock,
      accent: "gold",
      href: "/committee/dashboard?status=decision_pending",
    },
    {
      label: "Accepted",
      value: count(["accepted", "accepted_oral", "accepted_poster"]),
      icon: CircleCheck,
      accent: "gold",
      href: "/committee/dashboard?status=accepted,accepted_oral,accepted_poster",
    },
    {
      label: "Revision required",
      value: count(["revision_required"]),
      icon: RotateCcw,
      accent: "muted",
      href: "/committee/dashboard?status=revision_required",
    },
    { label: "Rejected", value: count(["rejected"]), icon: XCircle, accent: "red", href: "/committee/dashboard?status=rejected" },
  ]

  const rows = allRows.filter((r) => {
    if (statusList.length > 0 && !statusList.includes(r.status)) return false
    if (q) {
      const needle = q.toLowerCase()
      const haystack = `${r.title ?? ""} ${r.reference_number ?? ""}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scientific Committee Dashboard"
        description="ASM Nigeria 2026 — review outcomes and final decisions."
      />

      <StatGrid>
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} href={s.href} />
        ))}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search &amp; Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3" method="get">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by title or reference number"
                className="pl-8"
              />
            </div>
            <Select name="status" defaultValue={statusList.length === 1 ? statusList[0] : ""}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {FILTERABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {(q || status) && (
              <Link href="/committee/dashboard" className={cn(buttonVariants({ variant: "ghost" }))}>
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submissions ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {allRows.length === 0 ? "No submissions yet." : "No submissions match your search."}
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
