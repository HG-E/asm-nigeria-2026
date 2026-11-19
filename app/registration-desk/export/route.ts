import { NextResponse } from "next/server"

import { toCsv, toXlsx, toXlsxWithImages, type EmbeddedImage, type ExportCell, type ImageColumn } from "@/lib/exports/format"
import { requireRegistrationAccess } from "@/lib/auth"
import { generateQrDataUrl } from "@/lib/registration-qr"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { watDateTimeToUtcIso } from "@/lib/wat-date"

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


export async function GET(request: Request) {
  await requireRegistrationAccess()

  const url = new URL(request.url)
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
  const includePhotos = url.searchParams.get("photos") === "1" && format === "xlsx"
  const includeQr = url.searchParams.get("qr") === "1" && format === "xlsx"
  const from = watDateTimeToUtcIso(url.searchParams.get("from"), false)
  const to = watDateTimeToUtcIso(url.searchParams.get("to"), true)

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

  if (includePhotos || includeQr) {
    const imageColumns: ImageColumn[] = []

    if (includePhotos) {
      const admin = createAdminClient()
      // Downloading every photo at once (Promise.all over the whole list)
      // hits the same "Too many connections issued to the database" rate
      // limit seen signing URLs one at a time elsewhere in this app -- a few
      // hundred registrants is enough to trip it. A small fixed concurrency
      // keeps this reliable regardless of how many registrants match the
      // filter.
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
      imageColumns.push({ label: "Photo", images })
    }

    if (includeQr) {
      // Pure local CPU work, no network round trip -- safe to generate all
      // of these in parallel regardless of how many registrants match.
      const qrImages: EmbeddedImage[] = await Promise.all(
        registrations.map(async (r): Promise<EmbeddedImage> => {
          if (!r.reference_number) return null
          const dataUrl = await generateQrDataUrl(r.reference_number)
          return { base64: dataUrl, extension: "png" }
        })
      )
      imageColumns.push({ label: "QR", images: qrImages })
    }

    const buffer = await toXlsxWithImages(REGISTRATION_HEADERS, rows, "Conference Registrations", imageColumns)
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
