import Link from "next/link"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"
import { RichText } from "@/components/submission/rich-text"

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

const SORTS = ["date", "subtheme", "type", "attendance"] as const
type Sort = (typeof SORTS)[number]
const SORT_LABELS: Record<Sort, string> = {
  date: "Submission date",
  subtheme: "Subtheme",
  type: "Oral / Poster",
  attendance: "Attendance mode",
}

const ATTENDANCE_MODES = ["Virtual", "In-person", "Both"] as const

export default async function AdminSubmissionsPage(props: PageProps<"/admin/submissions">) {
  await requireRole("admin")
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const q = typeof searchParams.q === "string" ? searchParams.q : ""
  // Comma-separated so a dashboard stat card that groups several statuses
  // together (e.g. "Under review" = assigned + under_review) can link
  // straight into a correctly-filtered list here, not just a single status.
  const status = typeof searchParams.status === "string" ? searchParams.status : ""
  const statusList = status ? status.split(",").filter(Boolean) : []
  const subtheme = typeof searchParams.subtheme === "string" ? searchParams.subtheme : ""
  const attendance = typeof searchParams.attendance === "string" ? searchParams.attendance : ""
  const sort: Sort = SORTS.includes(searchParams.sort as Sort) ? (searchParams.sort as Sort) : "date"

  const { data: subthemes } = await supabase
    .from("conference_subthemes")
    .select("id, name")
    .order("name", { ascending: true })

  let query = supabase
    .from("submissions")
    .select(
      "id, reference_number, title, status, payment_status, submitted_at, created_at, conference_subthemes(name), user_profiles:corresponding_author_id(first_name, last_name, email)"
    )
    .order("created_at", { ascending: false })
    // Sorting/grouping below (by subtheme, oral/poster, or attendance mode)
    // happens in JS over the whole filtered set, not just one DB-ordered
    // page of it -- raised from 100 to comfortably cover every submission
    // this conference has ever received.
    .limit(1000)

  if (q) {
    // title_plain is the title without formatting tags, so a search for
    // "aureus infection" still finds "<i>Staphylococcus aureus</i> infection".
    query = query.or(`title_plain.ilike.%${q}%,reference_number.ilike.%${q}%`)
  }
  if (statusList.length === 1) {
    query = query.eq("status", statusList[0] as SubmissionStatus)
  } else if (statusList.length > 1) {
    query = query.in("status", statusList as SubmissionStatus[])
  }
  if (subtheme) {
    query = query.eq("subtheme_id", subtheme)
  }

  const { data: rawSubmissions } = await query

  // Attendance mode lives on conference_registrations, not on the submission
  // or the author's profile -- there's no foreign key between the two, a
  // presenter registers and submits separately, so the only link is the
  // email they used for each. Matched case-insensitively, same as the
  // certificate route and the registration-desk lookup. Fetching every
  // registration once and building a map is simpler and cheaper here than
  // one query per presenter -- at most a few hundred rows for this
  // conference, the same scale admin/registrations already loads whole.
  const { data: registrationsForAttendance } = await supabase
    .from("conference_registrations")
    .select("email, attendance_mode, payment_status")
  const attendanceByEmail = new Map<string, string>()
  for (const r of registrationsForAttendance ?? []) {
    const key = r.email.toLowerCase()
    const existing = attendanceByEmail.get(key)
    // Prefer a verified registration's mode over a pending/rejected one if
    // the same email shows up more than once (e.g. a rejected attempt
    // followed by a corrected resubmission).
    if (!existing || r.payment_status === "verified") {
      attendanceByEmail.set(key, r.attendance_mode)
    }
  }

  let submissions = (rawSubmissions ?? []).map((s) => ({
    ...s,
    attendanceMode: s.user_profiles?.email ? (attendanceByEmail.get(s.user_profiles.email.toLowerCase()) ?? null) : null,
  }))

  if (attendance) {
    submissions = submissions.filter((s) => s.attendanceMode === attendance)
  }

  const typeRank = (status: string) => (status === "accepted_oral" ? 0 : status === "accepted_poster" ? 1 : 2)
  if (sort === "subtheme") {
    submissions.sort((a, b) => (a.conference_subthemes?.name ?? "").localeCompare(b.conference_subthemes?.name ?? ""))
  } else if (sort === "type") {
    submissions.sort((a, b) => typeRank(a.status) - typeRank(b.status))
  } else if (sort === "attendance") {
    submissions.sort((a, b) => (a.attendanceMode ?? "").localeCompare(b.attendanceMode ?? ""))
  }
  // "date" needs no re-sort -- the DB query above already ordered by
  // created_at descending, and Array.prototype.sort above is stable, so
  // leaving it alone keeps that order exactly where no other sort applies.

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
            <Select name="status" defaultValue={statusList.length === 1 ? statusList[0] : ""}>
              <SelectTrigger className="w-48">
                {/* This page is a Server Component -- SelectValue's
                    children-as-function form isn't valid here (functions
                    can't cross the server/client boundary; crashed this
                    whole page with "Functions are not valid as a child of
                    Client Components" until caught in testing). The current
                    value is already known at render time, so a plain
                    string works just as well. */}
                <SelectValue>
                  {statusList.length === 1 ? statusList[0].replaceAll("_", " ") : "All statuses"}
                </SelectValue>
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
            <Select name="subtheme" defaultValue={subtheme}>
              <SelectTrigger className="w-56">
                <SelectValue>
                  {subtheme ? ((subthemes ?? []).find((s) => s.id === subtheme)?.name ?? "All subthemes") : "All subthemes"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All subthemes</SelectItem>
                {(subthemes ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="attendance" defaultValue={attendance}>
              <SelectTrigger className="w-44">
                <SelectValue>{attendance || "All attendance modes"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All attendance modes</SelectItem>
                {ATTENDANCE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="sort" defaultValue={sort}>
              <SelectTrigger className="w-48">
                <SelectValue>{`Sort: ${SORT_LABELS[sort]}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {(q || status || subtheme || attendance || sort !== "date") && (
              <Link href="/admin/submissions" className={cn(buttonVariants({ variant: "ghost" }))}>
                Clear
              </Link>
            )}
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
                  <TableHead>Attendance</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="bg-card sticky left-0 z-10 max-w-64 border-r">
                      <Link href={`/admin/submissions/${s.id}`} className="block truncate font-medium hover:underline">
                        <RichText value={s.title} fallback="Untitled" />
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
                    <TableCell className="text-sm">{s.attendanceMode ?? "—"}</TableCell>
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
