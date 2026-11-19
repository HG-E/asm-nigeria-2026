import { NextResponse } from "next/server"

import { toCsv, toXlsx, toXlsxWithImages, type EmbeddedImage, type ExportCell } from "@/lib/exports/format"
import { requireRegistrationAccess } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const REGISTRATION_HEADERS = [
  "Reference Number",
  "Full Name",
  "Email",
  "Phone",
  "Institution",
  "Participant Category",
  "Attendance Mode",
  "Payment Status",
  "Attended",
  "Registered At",
]

type RegistrationRow = {
  reference_number: string | null
  full_name: string
  email: string
  phone: string | null
  institution: string | null
  participant_category: string
  attendance_mode: string
  payment_status: string
  attended: boolean
  created_at: string
  passport_photo_path: string | null
}

function registrationRow(r: RegistrationRow): ExportCell[] {
  return [
    r.reference_number,
    r.full_name,
    r.email,
    r.phone,
    r.institution,
    r.participant_category,
    r.attendance_mode,
    r.payment_status,
    r.attended ? "Yes" : "No",
    r.created_at,
  ]
}

// <input type="datetime-local"> sends a bare "YYYY-MM-DDTHH:mm" with no
// timezone, and a bare "YYYY-MM-DD" when only a date was filled in. Nigeria
// doesn't observe DST, so a fixed +01:00 offset is always the correct way to
// read that value as West Africa Time before comparing against created_at.
function toUtcIso(raw: string | null, endOfDay: boolean): string | null {
  if (!raw) return null
  let value = raw.length === 10 ? `${raw}T${endOfDay ? "23:59:59" : "00:00:00"}` : raw
  if (value.length === 16) value += ":00" // datetime-local with no seconds component
  return `${value}+01:00`
}

export async function GET(request: Request) {
  await requireRegistrationAccess()

  const url = new URL(request.url)
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
  const includePhotos = url.searchParams.get("photos") === "1" && format === "xlsx"
  const from = toUtcIso(url.searchParams.get("from"), false)
  const to = toUtcIso(url.searchParams.get("to"), true)

  const supabase = await createClient()
  let query = supabase
    .from("conference_registrations")
    .select(
      "reference_number, full_name, email, phone, institution, participant_category, attendance_mode, payment_status, attended, created_at, passport_photo_path"
    )
    .order("created_at")

  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to)

  const { data } = await query
  const registrations = data ?? []
  const rows = registrations.map(registrationRow)

  const filename = `asm-nigeria-2026-conference-registrations${from || to ? "-filtered" : ""}.${format}`

  if (includePhotos) {
    const admin = createAdminClient()
    // Downloading every photo at once (Promise.all over the whole list) hits
    // the same "Too many connections issued to the database" rate limit seen
    // signing URLs one at a time elsewhere in this app -- a few hundred
    // registrants is enough to trip it. A small fixed concurrency keeps this
    // reliable regardless of how many registrants match the filter.
    const CONCURRENCY = 8
    const images: EmbeddedImage[] = new Array(registrations.length).fill(null)
    let next = 0
    async function worker() {
      while (next < registrations.length) {
        const i = next++
        const r = registrations[i]
        if (!r.passport_photo_path) continue
        const { data: file } = await admin.storage
          .from("registration-receipts")
          .download(r.passport_photo_path)
        if (!file) continue
        const buffer = Buffer.from(await file.arrayBuffer())
        const extension = r.passport_photo_path.toLowerCase().endsWith(".png") ? "png" : "jpeg"
        images[i] = { base64: `data:image/${extension};base64,${buffer.toString("base64")}`, extension }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    const buffer = await toXlsxWithImages(REGISTRATION_HEADERS, rows, "Conference Registrations", images)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  if (format === "xlsx") {
    const buffer = await toXlsx(REGISTRATION_HEADERS, rows, "Conference Registrations")
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const csv = toCsv(REGISTRATION_HEADERS, rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
