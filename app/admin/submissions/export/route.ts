import { NextResponse } from "next/server"

import { requireRole } from "@/lib/auth"
import { toCsv, toXlsx, type ExportCell } from "@/lib/exports/format"
import { toPlain } from "@/lib/rich-text"
import {
  fetchFilteredSubmissions,
  SORTS,
  SUBMISSION_EXPORT_COLUMNS,
  type Sort,
  type SubmissionExportColumnKey,
  type SubmissionListRow,
} from "@/lib/submissions-list"
import { createClient } from "@/lib/supabase/server"

const CELL_GETTERS: Record<SubmissionExportColumnKey, (s: SubmissionListRow) => ExportCell> = {
  reference: (s) => s.reference_number,
  title: (s) => toPlain(s.title),
  author: (s) => (s.user_profiles ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}` : ""),
  email: (s) => s.user_profiles?.email ?? "",
  subtheme: (s) => s.conference_subthemes?.name ?? "",
  status: (s) => s.status,
  attendance: (s) => s.attendanceMode ?? "",
  payment: (s) => s.payment_status,
  submitted: (s) => s.submitted_at,
}

// Mirrors whatever q/status/subtheme/attendance/sort the admin Submissions
// page is currently showing, and whichever columns were checked in its
// download form -- so the download always matches what's on screen (and
// only the columns asked for) rather than silently exporting the whole,
// unfiltered, every-column table.
export async function GET(request: Request) {
  await requireRole("admin")
  const supabase = await createClient()

  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const status = url.searchParams.get("status") ?? ""
  const statusList = status ? status.split(",").filter(Boolean) : []
  const subtheme = url.searchParams.get("subtheme") ?? ""
  const attendance = url.searchParams.get("attendance") ?? ""
  const sortParam = url.searchParams.get("sort")
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "date"
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv"

  const requestedColumns = url.searchParams.getAll("columns")
  // Keep SUBMISSION_EXPORT_COLUMNS's own order regardless of the order
  // checkboxes happened to be submitted in, and fall back to every column
  // if none were selected (e.g. a hand-built URL with no "columns" at all).
  const columns =
    requestedColumns.length > 0
      ? SUBMISSION_EXPORT_COLUMNS.filter((c) => requestedColumns.includes(c.key))
      : SUBMISSION_EXPORT_COLUMNS

  const submissions = await fetchFilteredSubmissions(supabase, { q, statusList, subtheme, attendance, sort })

  const headers = columns.map((c) => c.label)
  const rows: ExportCell[][] = submissions.map((s) => columns.map((c) => CELL_GETTERS[c.key](s)))

  const filename = `asm-nigeria-2026-submissions.${format}`

  if (format === "xlsx") {
    const buffer = await toXlsx(headers, rows, "Submissions")
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const csv = toCsv(headers, rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
