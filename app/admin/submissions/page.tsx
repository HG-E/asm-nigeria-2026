import Link from "next/link"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

const STATUSES: SubmissionStatus[] = [
  "draft",
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

function statusVariant(status: SubmissionStatus): "gold" | "secondary" | "destructive" | "outline" {
  if (status === "draft") return "outline"
  if (status === "accepted" || status === "accepted_oral" || status === "accepted_poster") return "gold"
  if (status === "rejected" || status === "withdrawn") return "destructive"
  return "secondary"
}

export default async function AdminSubmissionsPage(props: PageProps<"/admin/submissions">) {
  await requireRole("admin")
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const q = typeof searchParams.q === "string" ? searchParams.q : ""
  const status = typeof searchParams.status === "string" ? searchParams.status : ""

  let query = supabase
    .from("submissions")
    .select(
      "id, reference_number, title, status, payment_status, submitted_at, created_at, conference_subthemes(name), user_profiles:corresponding_author_id(first_name, last_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (q) {
    query = query.or(`title.ilike.%${q}%,reference_number.ilike.%${q}%`)
  }
  if (status) {
    query = query.eq("status", status as SubmissionStatus)
  }

  const { data: submissions } = await query

  return (
    <div className="space-y-6">
      <PageHeader title="Submissions" description="All abstracts submitted to ASM Nigeria 2026." />

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
            <Select name="status" defaultValue={status}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Results{submissions ? ` (${submissions.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {!submissions || submissions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No submissions match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Submission</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="bg-card sticky left-0 z-10 max-w-64 border-r">
                      <Link href={`/admin/submissions/${s.id}`} className="block truncate font-medium hover:underline">
                        {s.title || "Untitled"}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">{s.reference_number ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      {s.user_profiles
                        ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>{s.conference_subthemes?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{s.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.payment_status === "verified"
                            ? "gold"
                            : s.payment_status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {s.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
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
