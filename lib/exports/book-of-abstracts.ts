import "server-only"

import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx"

import { ABSTRACT_SECTIONS, isStructured, type AbstractSections } from "@/lib/abstract-structure"
import type { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const ACCEPTED_STATUSES: Database["public"]["Enums"]["submission_status"][] = [
  "accepted",
  "accepted_oral",
  "accepted_poster",
]

// One accepted abstract, in the shape the Book of Abstracts needs. The CSV/XLSX
// export and the Word document are both built from this, so the two can never
// disagree about ordering, affiliation numbering or which abstracts are ready.
export type BookEntry = {
  subthemeNo: number | null
  subtheme: string
  reference: string
  presentation: string
  title: string
  authors: { name: string; affiliation: number; corresponding: boolean }[]
  affiliations: string[]
  correspondingName: string
  correspondingEmail: string
  keywords: string[]
  sections: AbstractSections | null // null = not (yet) in the four-part structure
  legacyText: string
  restructured: boolean
}

export async function fetchBookEntries(supabase: SupabaseClient): Promise<BookEntry[]> {
  const { data } = await supabase
    .from("submissions")
    .select(
      "reference_number, title, keywords, status, presentation_preference, current_version, conference_subthemes(name, sort_order), submission_authors(author_order, is_corresponding, first_name, last_name, institution, country, email), submission_versions(version_number, abstract_text, abstract_text_original, abstract_background, abstract_methods, abstract_results, abstract_conclusion)"
    )
    .in("status", ACCEPTED_STATUSES)

  const sorted = [...(data ?? [])].sort(
    (a, b) =>
      (a.conference_subthemes?.sort_order ?? 99) - (b.conference_subthemes?.sort_order ?? 99) ||
      (a.reference_number ?? "").localeCompare(b.reference_number ?? "", undefined, { numeric: true })
  )

  return sorted.map((s): BookEntry => {
    const authors = [...s.submission_authors].sort((a, b) => a.author_order - b.author_order)
    // Affiliations are numbered in order of first appearance and shared between
    // authors from the same institution -- the standard Book of Abstracts line.
    const affiliations: string[] = []
    const authorList = authors.map((a) => {
      // Many authors typed the country into the institution field as well;
      // don't print "Kaduna, Nigeria, Nigeria".
      const institution = (a.institution ?? "").trim()
      const country = (a.country ?? "").trim()
      const affiliation =
        country && institution.toLowerCase().endsWith(country.toLowerCase())
          ? institution
          : [institution, country].filter(Boolean).join(", ")
      let idx = affiliations.indexOf(affiliation)
      if (idx === -1) {
        affiliations.push(affiliation)
        idx = affiliations.length - 1
      }
      return {
        name: `${a.first_name} ${a.last_name}`.trim(),
        affiliation: idx + 1,
        corresponding: a.is_corresponding,
      }
    })
    const corresponding = authors.find((a) => a.is_corresponding)
    const version = s.submission_versions.find((v) => v.version_number === s.current_version)
    const structured = version ? isStructured(version) : false

    return {
      subthemeNo: s.conference_subthemes?.sort_order ?? null,
      subtheme: s.conference_subthemes?.name ?? "",
      reference: s.reference_number ?? "",
      presentation:
        s.status === "accepted_oral" ? "Oral" : s.status === "accepted_poster" ? "Poster" : s.presentation_preference,
      title: s.title,
      authors: authorList,
      affiliations,
      correspondingName: corresponding ? `${corresponding.first_name} ${corresponding.last_name}` : "",
      correspondingEmail: corresponding?.email ?? "",
      keywords: s.keywords ?? [],
      sections:
        structured && version
          ? {
              background: version.abstract_background ?? "",
              methods: version.abstract_methods ?? "",
              results: version.abstract_results ?? "",
              conclusion: version.abstract_conclusion ?? "",
            }
          : null,
      legacyText: structured ? "" : (version?.abstract_text ?? ""),
      restructured: structured && Boolean(version?.abstract_text_original),
    }
  })
}

// How close the accepted abstracts are to print-ready -- shown on the Exports
// page so the committee can see, at a glance, who is still outstanding.
export function bookReadiness(entries: BookEntry[]) {
  const outstanding = entries.filter((e) => !e.sections)
  return {
    total: entries.length,
    ready: entries.length - outstanding.length,
    outstanding: outstanding.map((e) => ({
      reference: e.reference,
      title: e.title,
      author: e.correspondingName,
      email: e.correspondingEmail,
      missing: e.legacyText.trim() === "",
    })),
  }
}

const FONT = "Times New Roman"

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; superScript?: boolean; color?: string } = {}) {
  return new TextRun({ text, font: FONT, size: opts.size ?? 22, ...opts })
}

function entryParagraphs(e: BookEntry): Paragraph[] {
  const out: Paragraph[] = []

  out.push(
    new Paragraph({
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [run(`${e.reference}${e.presentation ? `  ·  ${e.presentation} presentation` : ""}`, { size: 18, color: "7A1F2B", bold: true })],
    })
  )
  out.push(
    new Paragraph({
      spacing: { after: 100 },
      keepNext: true,
      children: [run(e.title, { bold: true, size: 26 })],
    })
  )

  // Authors with true superscript affiliation numbers (and * for the
  // corresponding author) instead of Unicode look-alikes.
  const authorRuns: TextRun[] = []
  e.authors.forEach((a, i) => {
    if (i > 0) authorRuns.push(run(", "))
    authorRuns.push(run(a.name))
    authorRuns.push(run(`${a.affiliation}${a.corresponding ? "*" : ""}`, { superScript: true }))
  })
  out.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: authorRuns }))

  const affRuns: TextRun[] = []
  e.affiliations.forEach((aff, i) => {
    if (i > 0) affRuns.push(run("; ", { italics: true, size: 19 }))
    affRuns.push(run(String(i + 1), { superScript: true, italics: true, size: 19 }))
    affRuns.push(run(aff, { italics: true, size: 19 }))
  })
  out.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: affRuns }))

  if (e.correspondingEmail) {
    out.push(
      new Paragraph({
        spacing: { after: 140 },
        keepNext: true,
        children: [run(`*Corresponding author: ${e.correspondingName} (${e.correspondingEmail})`, { size: 19 })],
      })
    )
  }

  if (e.sections) {
    for (const s of ABSTRACT_SECTIONS) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
          children: [run(`${s.label}: `, { bold: true }), run(e.sections[s.key])],
        })
      )
    }
  } else {
    out.push(
      new Paragraph({
        spacing: { after: 80 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          run(
            e.legacyText.trim() || "[Abstract text missing — contact the author before printing.]",
            { color: "B00020" }
          ),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [run("[Not yet restructured into Background / Methods / Results / Conclusion]", { italics: true, size: 18, color: "B00020" })],
      })
    )
  }

  if (e.keywords.length > 0) {
    out.push(
      new Paragraph({
        spacing: { before: 60, after: 240 },
        children: [run("Keywords: ", { bold: true, size: 20 }), run(e.keywords.join("; "), { size: 20 })],
      })
    )
  }
  return out
}

export async function buildBookDocx(entries: BookEntry[], generatedOn: Date): Promise<Buffer> {
  const readiness = bookReadiness(entries)
  const generated = generatedOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })

  const cover: Paragraph[] = [
    new Paragraph({ spacing: { before: 2400, after: 200 }, alignment: AlignmentType.CENTER, children: [run("First ASM Nigeria Conference", { bold: true, size: 44, color: "003087" })] }),
    new Paragraph({ spacing: { after: 400 }, alignment: AlignmentType.CENTER, children: [run("Book of Abstracts", { bold: true, size: 56, color: "7A1F2B" })] }),
    new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [run("One Health in Action: Advancing Microbial Science for Global Health, Animal & Environmental Health", { italics: true, size: 26 })] }),
    new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [run("22–25 November 2026 · National Open University of Nigeria, Abuja · Hybrid", { size: 22 })] }),
    new Paragraph({
      spacing: { before: 600 },
      alignment: AlignmentType.CENTER,
      children: [
        run(
          readiness.outstanding.length === 0
            ? `${readiness.total} accepted abstracts · compiled ${generated}`
            : `DRAFT — ${readiness.total} accepted abstracts, ${readiness.outstanding.length} not yet in the four-part format · compiled ${generated}`,
          { size: 20, color: readiness.outstanding.length === 0 ? "444444" : "B00020", bold: readiness.outstanding.length > 0 }
        ),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  const body: Paragraph[] = []
  let currentSubtheme: string | null = null
  for (const e of entries) {
    const key = `${e.subthemeNo ?? ""}|${e.subtheme}`
    if (key !== currentSubtheme) {
      currentSubtheme = key
      body.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: body.length > 0,
          spacing: { after: 240 },
          children: [run(e.subthemeNo ? `Sub-theme ${e.subthemeNo}: ${e.subtheme}` : e.subtheme || "Unassigned sub-theme", { bold: true, size: 32, color: "003087" })],
        })
      )
    }
    body.push(...entryParagraphs(e))
  }

  const doc = new Document({
    creator: "ASM Nigeria 2026",
    title: "Book of Abstracts — First ASM Nigeria Conference",
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: ["ASM Nigeria 2026 · Book of Abstracts · ", PageNumber.CURRENT], font: FONT, size: 16, color: "666666" }),
                ],
              }),
            ],
          }),
        },
        children: [...cover, ...body],
      },
    ],
  })
  return Packer.toBuffer(doc)
}
