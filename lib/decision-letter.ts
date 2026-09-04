import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

// The real letterhead (supplied 2026-09-04) is 2828x4000px, ratio ~0.7071 --
// almost exactly A4 (595.28x841.89pt, ratio 0.7072), same "full-bleed
// template as the background, draw text over the blank area" approach
// lib/certificate.ts uses, just portrait instead of landscape. Header
// content occupies the top ~17.3% of the image (the red rule under the
// contact details); a second, heavier rule sits at ~68% down, marking
// where the template's own blank-margin footer band begins. Measured
// directly against the supplied PNG, not eyeballed.
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
// 0.173 (the measured header-block fraction) put Document B's opening line
// right up against the letterhead's own red rule, and Document A's badge
// straight over its address line -- generated and visually checked a real
// PDF, then widened this margin rather than guessing.
const CONTENT_TOP_Y = PAGE_HEIGHT - PAGE_HEIGHT * 0.205
const MARGIN_X = PAGE_WIDTH * 0.08
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

const INK = rgb(0.1098, 0.1412, 0.1882)
const INK_SOFT = rgb(0.29, 0.33, 0.4)
const ASM_RED = rgb(0.8, 0.1333, 0.1608)
const ASM_BLUE = rgb(0, 0.1882, 0.5294)

async function loadLetterheadImage(pdfDoc: PDFDocument) {
  const templatePath = path.join(process.cwd(), "public/letterhead/asm-nigeria-letterhead.png")
  const bytes = await readFile(templatePath)
  return pdfDoc.embedPng(bytes)
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
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
  return lines
}

type DrawState = { page: PDFPage; y: number }

function drawParagraph(
  state: DrawState,
  text: string,
  opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number; gapAfter?: number; x?: number; maxWidth?: number }
) {
  const lineHeight = opts.lineHeight ?? opts.size * 1.4
  const x = opts.x ?? MARGIN_X
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH
  const lines = wrapText(text, opts.font, opts.size, maxWidth)
  for (const line of lines) {
    state.page.drawText(line, { x, y: state.y, size: opts.size, font: opts.font, color: opts.color ?? INK })
    state.y -= lineHeight
  }
  state.y -= opts.gapAfter ?? lineHeight * 0.4
}

function drawLabelValue(
  state: DrawState,
  label: string,
  value: string,
  opts: { boldFont: PDFFont; regularFont: PDFFont; size: number }
) {
  const { size } = opts
  const labelText = `${label}: `
  state.page.drawText(labelText, { x: MARGIN_X, y: state.y, size, font: opts.boldFont, color: ASM_BLUE })
  const labelWidth = opts.boldFont.widthOfTextAtSize(labelText, size)
  const valueMaxWidth = CONTENT_WIDTH - labelWidth
  const valueLines = wrapText(value, opts.regularFont, size, valueMaxWidth)
  state.page.drawText(valueLines[0] ?? "", {
    x: MARGIN_X + labelWidth,
    y: state.y,
    size,
    font: opts.regularFont,
    color: INK,
  })
  state.y -= size * 1.4
  for (const extraLine of valueLines.slice(1)) {
    state.page.drawText(extraLine, { x: MARGIN_X, y: state.y, size, font: opts.regularFont, color: INK })
    state.y -= size * 1.4
  }
}

export type DecisionLetterData = {
  authorFullName: string
  abstractTitle: string
  referenceNumber: string
  presentationType: string
}

export async function generateAcceptanceNotificationPdf(data: DecisionLetterData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const letterheadImage = await loadLetterheadImage(pdfDoc)
  page.drawImage(letterheadImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

  const state: DrawState = { page, y: CONTENT_TOP_Y }

  const badge = "ABSTRACT STATUS: ACCEPTED"
  const badgeSize = 13
  const badgeWidth = bold.widthOfTextAtSize(badge, badgeSize)
  page.drawText(badge, {
    x: MARGIN_X + (CONTENT_WIDTH - badgeWidth) / 2,
    y: state.y,
    size: badgeSize,
    font: bold,
    color: ASM_RED,
  })
  state.y -= badgeSize * 1.6

  const keepNote = "Please keep a copy of this notification for your records"
  const keepSize = 9
  const keepWidth = italic.widthOfTextAtSize(keepNote, keepSize)
  page.drawText(keepNote, {
    x: MARGIN_X + (CONTENT_WIDTH - keepWidth) / 2,
    y: state.y,
    size: keepSize,
    font: italic,
    color: INK_SOFT,
  })
  state.y -= keepSize * 2.6

  drawParagraph(state, `Dear ${data.authorFullName},`, { font: regular, size: 11, gapAfter: 10 })
  drawParagraph(
    state,
    `Congratulations! On behalf of the Scientific Programme Committee, your abstract has been accepted for ${data.presentationType} presentation at ASM Nigeria 2026, holding November 22-24, 2026 in Abuja, Nigeria.`,
    { font: regular, size: 11, gapAfter: 14 }
  )

  drawLabelValue(state, "Reference Number", data.referenceNumber, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Abstract Title", data.abstractTitle, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Presentation Type", data.presentationType, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Presentation Date/Time", "To be confirmed closer to the conference", {
    boldFont: bold,
    regularFont: regular,
    size: 10.5,
  })
  state.y -= 8

  page.drawText("What happens next:", { x: MARGIN_X, y: state.y, size: 11, font: bold, color: INK })
  state.y -= 18

  const nextSteps = [
    "Watch for your session assignment - presentation day, date, and time will be communicated closer to the conference.",
    "Your official letter - a separate signed Letter of Invitation is available via the link already sent to you.",
  ]
  nextSteps.forEach((step, i) => {
    drawParagraph(state, `${i + 1}. ${step}`, { font: regular, size: 10.5, gapAfter: 8 })
  })
  state.y -= 6

  drawParagraph(
    state,
    "Embargo Policy: The findings and content of accepted abstracts should not be publicly released, published, or promoted before their scheduled presentation date at ASM Nigeria 2026. Authors are encouraged to coordinate any press or media engagement with the Scientific Programme Committee via the secretariat.",
    { font: italic, size: 9.5, color: INK_SOFT, gapAfter: 18 }
  )

  page.drawText("ASM Nigeria 2026 Secretariat", { x: MARGIN_X, y: state.y, size: 12, font: bold, color: ASM_BLUE })
  state.y -= 30

  const footerLines = ["ASM Nigeria 2026 - Abuja, Nigeria", "Secretariat: asmnigeriaonehealth@gmail.com"]
  for (const line of footerLines) {
    const w = regular.widthOfTextAtSize(line, 9)
    page.drawText(line, { x: MARGIN_X + (CONTENT_WIDTH - w) / 2, y: state.y, size: 9, font: regular, color: INK_SOFT })
    state.y -= 13
  }

  return pdfDoc.save()
}

export async function generateAcceptanceLetterPdf(data: DecisionLetterData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const letterheadImage = await loadLetterheadImage(pdfDoc)
  page.drawImage(letterheadImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman)

  const state: DrawState = { page, y: CONTENT_TOP_Y }

  drawParagraph(state, "To Whom It May Concern,", { font: regular, size: 11, gapAfter: 14 })

  drawParagraph(
    state,
    `The American Society for Microbiology (ASM) Nigeria is pleased to confirm that the abstract submitted by ${data.authorFullName} has been accepted for ${data.presentationType} presentation at the First ASM Nigeria Conference (ASM Nigeria 2026), themed "One Health in Action: Advancing Microbial Science for Human, Animal, Environmental and Global Health," holding November 22-24, 2026 in Abuja, Nigeria.`,
    { font: regular, size: 11, gapAfter: 12 }
  )

  drawParagraph(
    state,
    "ASM Nigeria brings together microbial scientists, clinicians, researchers and students under the One Health approach, advancing the Society's mission to connect science with human, animal, and environmental health across Nigeria and the region.",
    { font: regular, size: 11, gapAfter: 16 }
  )

  drawLabelValue(state, "Reference Number", data.referenceNumber, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Abstract Title", data.abstractTitle, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Presentation Type", data.presentationType, { boldFont: bold, regularFont: regular, size: 10.5 })
  drawLabelValue(state, "Presentation Date/Time", "To be confirmed closer to the conference", {
    boldFont: bold,
    regularFont: regular,
    size: 10.5,
  })
  drawLabelValue(
    state,
    "Venue",
    "Conference Centre, National Open University of Nigeria, Abuja",
    { boldFont: bold, regularFont: regular, size: 10.5 }
  )
  state.y -= 10

  drawParagraph(state, "Congratulations, and we look forward to your participation in Abuja this November.", {
    font: regular,
    size: 11,
    gapAfter: 22,
  })

  page.drawText("Sincerely,", { x: MARGIN_X, y: state.y, size: 11, font: regular, color: INK })
  state.y -= 44

  // Three signatories side by side (per her confirmed instruction), same
  // arrangement the ASM Microbe sample itself uses for its multiple chairs.
  const signatories = [
    { name: "Prof. Nura Muhammad Sani", title: "Chairman, Scientific Programme Committee" },
    { name: "Dr. Stephen Dare Oloninefa", title: "Secretary, Scientific Programme Committee" },
    { name: "Dr. Abumhere S. Aziegbemhin, Ph.D.", title: "Secretary, Main Organising Committee" },
  ]
  const colGap = 14
  const colWidth = (CONTENT_WIDTH - colGap * 2) / 3
  const sigSize = 9
  const titleSize = 7.6

  signatories.forEach((signatory, i) => {
    const colX = MARGIN_X + i * (colWidth + colGap)
    page.drawLine({
      start: { x: colX, y: state.y },
      end: { x: colX + colWidth - 10, y: state.y },
      thickness: 0.75,
      color: INK_SOFT,
    })
    let colY = state.y - 12
    const nameLines = wrapText(signatory.name, bold, sigSize, colWidth)
    for (const line of nameLines) {
      page.drawText(line, { x: colX, y: colY, size: sigSize, font: bold, color: INK })
      colY -= sigSize * 1.3
    }
    const titleLines = wrapText(signatory.title, regular, titleSize, colWidth)
    for (const line of titleLines) {
      page.drawText(line, { x: colX, y: colY, size: titleSize, font: regular, color: INK_SOFT })
      colY -= titleSize * 1.3
    }
  })

  return pdfDoc.save()
}
