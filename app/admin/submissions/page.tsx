import Link from "next/link"

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
      <div>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="text-muted-foreground text-sm">
          All abstracts submitted to ASM Nigeria 2026.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search &amp; Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3" method="get">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by title or reference number"
              className="max-w-sm"
            />
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
        <CardContent>
          {!submissions || submissions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No submissions match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
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
                    <TableCell className="font-mono text-xs">
                      {s.reference_number ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <Link href={`/admin/submissions/${s.id}`} className="hover:underline">
                        {s.title || "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.user_profiles
                        ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>{s.conference_subthemes?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.payment_status === "verified"
                            ? "default"
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
