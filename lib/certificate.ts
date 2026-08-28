import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

// Both templates are ~1.4142:1 (Canva exports at 5250x3712 and 4500x3182
// respectively), which is almost exactly the A4 ratio -- rendered onto a
// real A4-landscape PDF page so they print at correct physical size. Box
// coordinates below were calibrated directly against each template image
// (drew a debug rectangle, compared against the actual gold-bordered boxes
// and blank lines, adjusted until they matched) rather than eyeballed from
// the pixel grid alone.
const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

const INK_BLUE = rgb(0.02, 0.09, 0.24)
const MUTED_BLUE = rgb(0.25, 0.29, 0.42)
const ASM_RED = rgb(0.8, 0.13, 0.16)

// { left, top, width, height } in PDF points, `top` measured from the top
// of the page (converted to PDF's bottom-origin coordinate system at draw
// time).
const PARTICIPATION_NAME_BOX = { left: 80.8, top: 216.8, width: 681.2, height: 54.7 }
const PARTICIPATION_NUMBER_LINE = { left: 581.0, top: 82.1, width: 181.0, height: 16.8 }

const PRESENTATION_NAME_BOX = { left: 159.1, top: 181.9, width: 525.0, height: 40.0 }
const PRESENTATION_TITLE_BOX = { left: 134.7, top: 254.7, width: 557.7, height: 46.3 }
const PRESENTATION_TYPE_VALUE = { left: 327.5, top: 333.8, width: 325.0, height: 14.7 }
const PRESENTATION_NUMBER_LINE = { left: 572.5, top: 70.7, width: 176.8, height: 14.7 }

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

  // The template's placeholder text ("[Oral Presentation / Poster
  // Presentation]") is baked into the background image -- cover it (and
  // the static colon right before it, since the two can't be cleanly
  // separated at this resolution) with a white rectangle, then draw the
  // real single value with our own leading colon, in the same red/bold
  // style the static "Presentation Type" label uses.
  page.drawRectangle({
    x: PRESENTATION_TYPE_VALUE.left - 2,
    y: PAGE_HEIGHT - PRESENTATION_TYPE_VALUE.top - PRESENTATION_TYPE_VALUE.height - 4,
    width: PRESENTATION_TYPE_VALUE.width + 6,
    height: PRESENTATION_TYPE_VALUE.height + 10,
    color: rgb(1, 1, 1),
  })
  const typeSize = 15
  const typeBaselineY = PAGE_HEIGHT - PRESENTATION_TYPE_VALUE.top - PRESENTATION_TYPE_VALUE.height + 3
  page.drawText(`: ${params.presentationType}`, {
    x: PRESENTATION_TYPE_VALUE.left - 2,
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
