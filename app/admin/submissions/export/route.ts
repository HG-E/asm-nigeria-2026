import { NextResponse } from "next/server"

import { requireRole } from "@/lib/auth"
import { toCsv, toXlsx, type ExportCell } from "@/lib/exports/format"
import { toPlain } from "@/lib/rich-text"
import { fetchFilteredSubmissions, SORTS, type Sort } from "@/lib/submissions-list"
import { createClient } from "@/lib/supabase/server"

const HEADERS = [
  "Reference Number",
  "Title",
  "Author",
  "Email",
  "Subtheme",
  "Status",
  "Attendance",
  "Payment Status",
  "Submitted At",
]

// Mirrors whatever q/status/subtheme/attendance/sort the admin Submissions
// page is currently showing -- exportHref() there builds the exact same
// query string, so the download always matches what's on screen rather
// than silently exporting the whole, unfiltered table.
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

  const submissions = await fetchFilteredSubmissions(supabase, { q, statusList, subtheme, attendance, sort })

  const rows: ExportCell[][] = submissions.map((s) => [
    s.reference_number,
    toPlain(s.title),
    s.user_profiles ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}` : "",
    s.user_profiles?.email ?? "",
    s.conference_subthemes?.name ?? "",
    s.status,
    s.attendanceMode ?? "",
    s.payment_status,
    s.submitted_at,
  ])

  const filename = `asm-nigeria-2026-submissions.${format}`

  if (format === "xlsx") {
    const buffer = await toXlsx(HEADERS, rows, "Submissions")
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const csv = toCsv(HEADERS, rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
