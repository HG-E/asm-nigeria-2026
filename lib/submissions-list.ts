import "server-only"

import type { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

export const SORTS = ["date", "subtheme", "type", "attendance"] as const
export type Sort = (typeof SORTS)[number]
export const SORT_LABELS: Record<Sort, string> = {
  date: "Submission date",
  subtheme: "Subtheme",
  type: "Oral / Poster",
  attendance: "Attendance mode",
}

export const ATTENDANCE_MODES = ["Virtual", "In-person", "Both"] as const

// Shared by the Submissions page's download form (which column checkboxes
// to render, in this order) and the export route (which columns to
// actually include and in what order) -- same reasoning as the rest of
// this file: one definition, so the two can't disagree about what a column
// key means.
export const SUBMISSION_EXPORT_COLUMNS = [
  { key: "reference", label: "Reference Number" },
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "email", label: "Email" },
  { key: "subtheme", label: "Subtheme" },
  { key: "status", label: "Status" },
  { key: "attendance", label: "Attendance" },
  { key: "payment", label: "Payment Status" },
  { key: "submitted", label: "Submitted At" },
] as const
export type SubmissionExportColumnKey = (typeof SUBMISSION_EXPORT_COLUMNS)[number]["key"]

// For admin/presentations, which is scoped to approved presenters only
// (accepted_oral + accepted_poster) rather than every submission regardless
// of status.
export const PRESENTATION_TYPES = ["oral", "poster"] as const
export type PresentationType = (typeof PRESENTATION_TYPES)[number]
export const PRESENTATION_TYPE_LABELS: Record<PresentationType, string> = { oral: "Oral", poster: "Poster" }
export const STATUS_BY_TYPE: Record<PresentationType, SubmissionStatus> = {
  oral: "accepted_oral",
  poster: "accepted_poster",
}

export const PRESENTER_EXPORT_COLUMNS = [
  { key: "reference", label: "Reference Number" },
  { key: "title", label: "Title" },
  { key: "presenter", label: "Presenter" },
  { key: "email", label: "Email" },
  { key: "subtheme", label: "Subtheme" },
  { key: "type", label: "Presentation Type" },
  { key: "attendance", label: "Attendance" },
  { key: "slideStatus", label: "Slide Status" },
  { key: "slideSubmittedAt", label: "Slide Submitted At" },
  { key: "fileLink", label: "Slide File Link" },
] as const
export type PresenterExportColumnKey = (typeof PRESENTER_EXPORT_COLUMNS)[number]["key"]

export type SubmissionListRow = {
  id: string
  reference_number: string | null
  title: string
  status: string
  payment_status: string
  submitted_at: string | null
  created_at: string
  conference_subthemes: { name: string } | null
  user_profiles: { first_name: string; last_name: string; email: string } | null
  attendanceMode: string | null
}

export type SubmissionListParams = {
  q: string
  statusList: string[]
  subtheme: string
  attendance: string
  sort: Sort
}

// Shared by the admin Submissions page and its CSV/XLSX export route, so the
// two can never drift out of sync -- a download always matches exactly what
// the page that produced it was showing (same filters, same sort), rather
// than the export route growing its own slightly-different copy of this
// filtering/sorting logic over time.
export async function fetchFilteredSubmissions(
  supabase: SupabaseClient,
  { q, statusList, subtheme, attendance, sort }: SubmissionListParams
): Promise<SubmissionListRow[]> {
  let query = supabase
    .from("submissions")
    .select(
      "id, reference_number, title, status, payment_status, submitted_at, created_at, conference_subthemes(name), user_profiles:corresponding_author_id(first_name, last_name, email)"
    )
    .order("created_at", { ascending: false })
    // Sorting/grouping below (by subtheme, oral/poster, or attendance mode)
    // happens in JS over the whole filtered set, not just one DB-ordered
    // page of it -- comfortably covers every submission this conference has
    // ever received.
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

  let submissions: SubmissionListRow[] = (rawSubmissions ?? []).map((s) => ({
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

  return submissions
}
