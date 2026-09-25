import { NextResponse } from "next/server"

import { buildBookDocx, fetchBookEntries } from "@/lib/exports/book-of-abstracts"
import { toCsv, toXlsx } from "@/lib/exports/format"
import { getDataset } from "@/lib/exports/datasets"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  await requireRole("admin")

  const { dataset: slug } = await params
  const dataset = getDataset(slug)
  if (!dataset) {
    return NextResponse.json({ error: "Unknown export dataset." }, { status: 404 })
  }

  const requested = new URL(request.url).searchParams.get("format")
  const supabase = await createClient()

  // The typeset Book of Abstracts (Word) exists only for that one dataset.
  if (requested === "docx") {
    if (slug !== "book-of-abstracts") {
      return NextResponse.json({ error: "Word export is only available for the Book of Abstracts." }, { status: 400 })
    }
    const buffer = await buildBookDocx(await fetchBookEntries(supabase), new Date())
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="asm-nigeria-2026-book-of-abstracts.docx"`,
      },
    })
  }

  const format = requested === "xlsx" ? "xlsx" : "csv"
  const { headers, rows } = await dataset.fetch(supabase)

  const filename = `asm-nigeria-2026-${slug}.${format}`

  if (format === "xlsx") {
    const buffer = await toXlsx(headers, rows, dataset.label)
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
