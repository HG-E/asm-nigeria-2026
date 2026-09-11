import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

// Both templates supplied 2026-09-11 (replacing the earlier ones, which
// had the presentation certificate's Braide Wesley/Makolo signature lines
// blank) are now the same 4500x3182 -- ~1.4142:1, almost exactly the A4
// ratio -- rendered onto a real A4-landscape PDF page so they print at
// correct physical size. Box coordinates below were calibrated by flood-
// filling each template's actual fillable-box fill color (~rgb(247,248,250))
// and the red "Presentation Type" label's pixel bounds programmatically,
// then converting px -> pt at this page's scale, rather than eyeballed.
const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

const INK_BLUE = rgb(0.02, 0.09, 0.24)
const MUTED_BLUE = rgb(0.25, 0.29, 0.42)
const ASM_RED = rgb(0.8, 0.13, 0.16)

// { left, top, width, height } in PDF points, `top` measured from the top
// of the page (converted to PDF's bottom-origin coordinate system at draw
// time).
const PARTICIPATION_NAME_BOX = { left: 80.1, top: 217.2, width: 682.9, height: 53.3 }
const PARTICIPATION_NUMBER_LINE = { left: 581.6, top: 73.4, width: 176.6, height: 16.8 }

const PRESENTATION_NAME_BOX = { left: 160.7, top: 182.2, width: 522.4, height: 40.4 }
const PRESENTATION_TITLE_BOX = { left: 88.5, top: 254.6, width: 641.0, height: 47.1 }
// Bounds of the baked-in "Presentation Type" label itself (no colon, no
// placeholder value baked in this template) -- the real value is drawn
// starting just past its right edge, same baseline.
const PRESENTATION_TYPE_LABEL = { left: 340.7, top: 334.1, width: 137.0, height: 14.2 }
const PRESENTATION_NUMBER_LINE = { left: 574.1, top: 58.6, width: 176.6, height: 14.7 }

async function loadTemplate(pdfDoc: PDFDocument, filename: string) {
  const templatePath = path.join(process.cwd(), "public/certificates", filename)
  const templateBytes = await readFile(templatePath)
  return pdfDoc.embedPng(templateBytes)
}

function drawCenteredFitted(
  page: PDFPage,
  text: string,
  box: { left: number; top: number; width: number; height: number },
  font: PDFFont,
  opts: { maxSize: number; minSize: number; color: ReturnType<typeof rgb> }
) {
  let size = opts.maxSize
  while (font.widthOfTextAtSize(text, size) > box.width - 24 && size > opts.minSize) {
    size -= 1
  }
  const textWidth = font.widthOfTextAtSize(text, size)
  const x = box.left + (box.width - textWidth) / 2
  const y = PAGE_HEIGHT - box.top - box.height / 2 - size * 0.35
  page.drawText(text, { x, y, size, font, color: opts.color })
}

// Wraps text to fit the box width, shrinking font size if it still doesn't
// fit within the box height at up to 3 lines -- abstract titles run much
// longer than names and won't reliably fit on one line.
function drawWrappedFitted(
  page: PDFPage,
  text: string,
  box: { left: number; top: number; width: number; height: number },
  font: PDFFont,
  opts: { maxSize: number; minSize: number; color: ReturnType<typeof rgb> }
) {
  const maxWidth = box.width - 24
  let size = opts.maxSize
  let lines: string[] = []

  for (; size >= opts.minSize; size -= 1) {
    const lineHeight = size * 1.2
    const maxLines = Math.max(1, Math.floor((box.height - 8) / lineHeight))
    const words = text.split(/\s+/)
    lines = []
    let current = ""
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
    if (lines.length <= maxLines) break
  }

  const lineHeight = size * 1.2
  const totalHeight = lines.length * lineHeight
  let y = PAGE_HEIGHT - box.top - (box.height - totalHeight) / 2 - size * 0.85
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, size)
    const x = box.left + (box.width - lineWidth) / 2
    page.drawText(line, { x, y, size, font, color: opts.color })
    y -= lineHeight
  }
}

export async function generateParticipationCertificate(params: {
  fullName: string
  certificateNumber: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const templateImage = await loadTemplate(pdfDoc, "participation-template.png")
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const numberFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  drawCenteredFitted(page, params.fullName, PARTICIPATION_NAME_BOX, nameFont, {
    maxSize: 26,
    minSize: 12,
    color: INK_BLUE,
  })

  const numberLabel = `Certificate No: ${params.certificateNumber}`
  const numberSize = 9
  const numberWidth = numberFont.widthOfTextAtSize(numberLabel, numberSize)
  const numberX = PARTICIPATION_NUMBER_LINE.left + PARTICIPATION_NUMBER_LINE.width - numberWidth
  const numberBaselineY = PAGE_HEIGHT - PARTICIPATION_NUMBER_LINE.top - PARTICIPATION_NUMBER_LINE.height + 11
  page.drawText(numberLabel, { x: numberX, y: numberBaselineY, size: numberSize, font: numberFont, color: MUTED_BLUE })

  return pdfDoc.save()
}

export async function generatePresentationCertificate(params: {
  fullName: string
  abstractTitle: string
  presentationType: "Oral Presentation" | "Poster Presentation"
  certificateNumber: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const templateImage = await loadTemplate(pdfDoc, "presentation-template.png")
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
  const typeFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const numberFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  drawCenteredFitted(page, params.fullName, PRESENTATION_NAME_BOX, nameFont, {
    maxSize: 20,
    minSize: 11,
    color: INK_BLUE,
  })

  drawWrappedFitted(page, params.abstractTitle, PRESENTATION_TITLE_BOX, titleFont, {
    maxSize: 14,
    minSize: 9,
    color: INK_BLUE,
  })

  // This template bakes in only the bare "Presentation Type" label (no
  // colon, no placeholder value) -- draw the real value right after it,
  // same baseline, in the same red/bold style the label itself uses. No
  // white-rectangle cover needed this time; there's nothing there to hide.
  const typeSize = 15
  const typeBaselineY = PAGE_HEIGHT - PRESENTATION_TYPE_LABEL.top - PRESENTATION_TYPE_LABEL.height + 3
  page.drawText(`: ${params.presentationType}`, {
    x: PRESENTATION_TYPE_LABEL.left + PRESENTATION_TYPE_LABEL.width,
    y: typeBaselineY,
    size: typeSize,
    font: typeFont,
    color: ASM_RED,
  })

  const numberLabel = `Certificate No: ${params.certificateNumber}`
  const numberSize = 9
  const numberWidth = numberFont.widthOfTextAtSize(numberLabel, numberSize)
  const numberX = PRESENTATION_NUMBER_LINE.left + PRESENTATION_NUMBER_LINE.width - numberWidth
  const numberBaselineY = PAGE_HEIGHT - PRESENTATION_NUMBER_LINE.top - PRESENTATION_NUMBER_LINE.height + 17
  page.drawText(numberLabel, { x: numberX, y: numberBaselineY, size: numberSize, font: numberFont, color: MUTED_BLUE })

  return pdfDoc.save()
}
