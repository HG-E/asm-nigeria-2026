import { NextResponse } from "next/server"

import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { toCsv, toXlsxMultiSheet, type ExportCell } from "@/lib/exports/format"
import {
  fetchTrackingData,
  lookupScheduledSlot,
  lookupTrackedSubmission,
  type ScheduledSlot,
  type SubmissionRecord,
} from "@/lib/presentation-tracking"
import { toPlain } from "@/lib/rich-text"
import {
  fetchFilteredSubmissions,
  PRESENTATION_TYPES,
  PRESENTER_EXPORT_COLUMNS,
  SORTS,
  STATUS_BY_TYPE,
  type PresentationType,
  type PresenterExportColumnKey,
  type Sort,
  type SubmissionListRow,
} from "@/lib/submissions-list"
import { createClient } from "@/lib/supabase/server"

type Row = SubmissionListRow & { track: SubmissionRecord | null; scheduled: ScheduledSlot | null }

const CELL_GETTERS: Record<PresenterExportColumnKey, (s: Row) => ExportCell> = {
  reference: (s) => s.reference_number,
  title: (s) => toPlain(s.title),
  presenter: (s) => (s.user_profiles ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}` : ""),
  email: (s) => s.user_profiles?.email ?? "",
  subtheme: (s) => s.conference_subthemes?.name ?? "",
  type: (s) => (s.status === "accepted_oral" ? "Oral" : "Poster"),
  attendance: (s) => s.attendanceMode ?? "",
  scheduledDay: (s) => s.scheduled?.day ?? "Not scheduled",
  scheduledTime: (s) => s.scheduled?.time ?? "",
  slideStatus: (s) => (s.status !== "accepted_oral" ? "N/A (poster)" : s.track ? "Submitted" : "Not yet"),
  slideSubmittedAt: (s) => s.track?.timestamp ?? "",
  fileLink: (s) => s.track?.fileLink ?? "",
}

// Mirrors whatever q/type/subtheme/attendance/sort the admin Presentations
// page is currently showing, and whichever columns were checked in its
// download form -- same reasoning as admin/submissions's export route.
export async function GET(request: Request) {
  await requireRole("admin")
  const supabase = await createClient()
  const conference = await getActiveConference()

  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const typeParam = url.searchParams.get("type")
  const type: PresentationType | "" = PRESENTATION_TYPES.includes(typeParam as PresentationType)
    ? (typeParam as PresentationType)
    : ""
  const subtheme = url.searchParams.get("subtheme") ?? ""
  const attendance = url.searchParams.get("attendance") ?? ""
  const sortParam = url.searchParams.get("sort")
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "date"
  const formatParam = url.searchParams.get("format")
  const format: "csv" | "xlsx" | "xlsx-grouped" =
    formatParam === "xlsx-grouped" ? "xlsx-grouped" : formatParam === "xlsx" ? "xlsx" : "csv"

  const requestedColumns = url.searchParams.getAll("columns")
  const columns =
    requestedColumns.length > 0
      ? PRESENTER_EXPORT_COLUMNS.filter((c) => requestedColumns.includes(c.key))
      : PRESENTER_EXPORT_COLUMNS

  const statusList = type ? [STATUS_BY_TYPE[type]] : [STATUS_BY_TYPE.oral, STATUS_BY_TYPE.poster]
  const submissions = await fetchFilteredSubmissions(supabase, { q, statusList, subtheme, attendance, sort })

  const tracking = conference?.presentation_tracking_csv_url
    ? await fetchTrackingData(conference.presentation_tracking_csv_url)
    : null
  const trackingData = tracking && !("error" in tracking) ? tracking : null

  const presenters: Row[] = submissions.map((s) => ({
    ...s,
    track:
      trackingData && s.status === "accepted_oral"
        ? lookupTrackedSubmission(trackingData, s.reference_number, s.user_profiles?.email)
        : null,
    scheduled: lookupScheduledSlot(s.reference_number),
  }))

  const headers = columns.map((c) => c.label)

  if (format === "xlsx-grouped") {
    // One sheet per subtheme -- grouped sorted alphabetically by name, with
    // ungrouped presenters (no subtheme assigned yet) collected in a final
    // "No Subtheme" sheet rather than silently dropped.
    const bySubtheme = new Map<string, Row[]>()
    for (const p of presenters) {
      const key = p.conference_subthemes?.name ?? "No Subtheme"
      const group = bySubtheme.get(key)
      if (group) group.push(p)
      else bySubtheme.set(key, [p])
    }
    const sheetNames = [...bySubtheme.keys()].sort((a, b) =>
      a === "No Subtheme" ? 1 : b === "No Subtheme" ? -1 : a.localeCompare(b)
    )
    const sheets = sheetNames.map((name) => ({
      name,
      headers,
      rows: bySubtheme.get(name)!.map((p) => columns.map((c) => CELL_GETTERS[c.key](p))),
    }))

    const buffer = await toXlsxMultiSheet(sheets)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="asm-nigeria-2026-presenters-by-subtheme.xlsx"`,
      },
    })
  }

  const rows: ExportCell[][] = presenters.map((p) => columns.map((c) => CELL_GETTERS[c.key](p)))
  const filename = `asm-nigeria-2026-presenters.${format}`

  if (format === "xlsx") {
    const buffer = await toXlsxMultiSheet([{ name: "Presenters", headers, rows }])
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
