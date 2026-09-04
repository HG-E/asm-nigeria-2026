import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFEmbeddedPage } from "pdf-lib"

// Conference-only letterhead (supplied 2026-09-04, replacing the earlier
// personal-office one): a real 2-page A4 PDF template, not an image. Page 1
// carries the banner (top ~15%, measured against the supplied file) with
// the rest blank for body text; page 2 is a blank continuation page with no
// header at all, meant for whatever a letter doesn't fit on page 1. Both
// pages are embedded as vector XObjects via pdf-lib's embedPdf rather than
// rasterized to PNG, so they stay sharp regardless of viewer zoom -- a step
// up from the PNG-background approach lib/certificate.ts uses, made
// possible because the source is already a real PDF.
const PAGE_WIDTH = 595.5
const PAGE_HEIGHT = 842.25
const HEADER_HEIGHT = PAGE_HEIGHT * 0.15
const CONTENT_TOP_Y_PAGE1 = PAGE_HEIGHT - HEADER_HEIGHT
const CONTENT_TOP_Y_CONT = PAGE_HEIGHT - 56
const BOTTOM_MARGIN = 64
const MARGIN_X = PAGE_WIDTH * 0.08
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

const INK = rgb(0.1098, 0.1412, 0.1882)
const INK_SOFT = rgb(0.29, 0.33, 0.4)
const ASM_RED = rgb(0.8, 0.1333, 0.1608)
const ASM_BLUE = rgb(0, 0.1882, 0.5294)

async function loadTemplatePages(pdfDoc: PDFDocument): Promise<[PDFEmbeddedPage, PDFEmbeddedPage]> {
  const templatePath = path.join(process.cwd(), "public/letterhead/asm-nigeria-letterhead.pdf")
  const templateBytes = await readFile(templatePath)
  const [headerPage, blankPage] = await pdfDoc.embedPdf(templateBytes, [0, 1])
  return [headerPage, blankPage]
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

// Tracks the current page/cursor across a document and starts a fresh
// (blank, headerless) page whenever content would run past the bottom
// margin -- the "if it needs 2 pages, use both template pages" rule from
// her instructions, applied automatically rather than guessed at per
// document. Page numbers only get drawn (in finalize()) when more than one
// page was actually used; a single-page letter stays unnumbered.
class LetterBuilder {
  pdfDoc!: PDFDocument
  private headerTemplate!: PDFEmbeddedPage
  private blankTemplate!: PDFEmbeddedPage
  private pages: PDFPage[] = []
  page!: PDFPage
  y = 0

  static async create(): Promise<LetterBuilder> {
    const builder = new LetterBuilder()
    builder.pdfDoc = await PDFDocument.create()
    ;[builder.headerTemplate, builder.blankTemplate] = await loadTemplatePages(builder.pdfDoc)
    builder.addPage()
    return builder
  }

  private addPage() {
    const page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    const isFirstPage = this.pages.length === 0
    const template = isFirstPage ? this.headerTemplate : this.blankTemplate
    page.drawPage(template, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })
    this.pages.push(page)
    this.page = page
    this.y = isFirstPage ? CONTENT_TOP_Y_PAGE1 : CONTENT_TOP_Y_CONT
  }

  ensureSpace(neededHeight: number) {
    if (this.y - neededHeight < BOTTOM_MARGIN) {
      this.addPage()
    }
  }

  drawParagraph(
    text: string,
    opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number; gapAfter?: number; x?: number; maxWidth?: number }
  ) {
    const lineHeight = opts.lineHeight ?? opts.size * 1.4
    const x = opts.x ?? MARGIN_X
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH
    const lines = wrapText(text, opts.font, opts.size, maxWidth)
    for (const line of lines) {
      this.ensureSpace(lineHeight)
      this.page.drawText(line, { x, y: this.y, size: opts.size, font: opts.font, color: opts.color ?? INK })
      this.y -= lineHeight
    }
    this.y -= opts.gapAfter ?? lineHeight * 0.4
  }

  drawLabelValue(label: string, value: string, opts: { boldFont: PDFFont; regularFont: PDFFont; size: number }) {
    const { size } = opts
    const labelText = `${label}: `
    const labelWidth = opts.boldFont.widthOfTextAtSize(labelText, size)
    const valueLines = wrapText(value, opts.regularFont, size, CONTENT_WIDTH - labelWidth)
    this.ensureSpace(size * 1.4 * Math.max(1, valueLines.length))
    this.page.drawText(labelText, { x: MARGIN_X, y: this.y, size, font: opts.boldFont, color: ASM_BLUE })
    this.page.drawText(valueLines[0] ?? "", {
      x: MARGIN_X + labelWidth,
      y: this.y,
      size,
      font: opts.regularFont,
      color: INK,
    })
    this.y -= size * 1.4
    for (const extraLine of valueLines.slice(1)) {
      this.ensureSpace(size * 1.4)
      this.page.drawText(extraLine, { x: MARGIN_X, y: this.y, size, font: opts.regularFont, color: INK })
      this.y -= size * 1.4
    }
  }

  // Call once, after all content is drawn. Numbers every page "Page i of N"
  // bottom-center -- but only if the letter actually spilled onto more
  // than one page; a single-page letter is left unnumbered.
  async finalize(): Promise<Uint8Array> {
    if (this.pages.length > 1) {
      const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica)
      const total = this.pages.length
      this.pages.forEach((page, i) => {
        const label = `Page ${i + 1} of ${total}`
        const size = 8.5
        const width = font.widthOfTextAtSize(label, size)
        page.drawText(label, {
          x: (PAGE_WIDTH - width) / 2,
          y: 28,
          size,
          font,
          color: INK_SOFT,
        })
      })
    }
    return this.pdfDoc.save()
  }
}

export type DecisionLetterData = {
  authorFullName: string
  abstractTitle: string
  referenceNumber: string
  presentationType: string
}

export async function generateAcceptanceNotificationPdf(data: DecisionLetterData): Promise<Uint8Array> {
  const b = await LetterBuilder.create()
  const bold = await b.pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const regular = await b.pdfDoc.embedFont(StandardFonts.TimesRoman)
  const italic = await b.pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

  const badge = "ABSTRACT STATUS: ACCEPTED"
  const badgeSize = 13
  const badgeWidth = bold.widthOfTextAtSize(badge, badgeSize)
  b.page.drawText(badge, { x: MARGIN_X + (CONTENT_WIDTH - badgeWidth) / 2, y: b.y, size: badgeSize, font: bold, color: ASM_RED })
  b.y -= badgeSize * 1.6

  const keepNote = "Please keep a copy of this notification for your records"
  const keepSize = 9
  const keepWidth = italic.widthOfTextAtSize(keepNote, keepSize)
  b.page.drawText(keepNote, { x: MARGIN_X + (CONTENT_WIDTH - keepWidth) / 2, y: b.y, size: keepSize, font: italic, color: INK_SOFT })
  b.y -= keepSize * 2.6

  b.drawParagraph(`Dear ${data.authorFullName},`, { font: regular, size: 11, gapAfter: 10 })
  b.drawParagraph(
    `Congratulations! On behalf of the Scientific Programme Committee, your abstract has been accepted for ${data.presentationType} presentation at ASM Nigeria 2026, holding November 22-24, 2026 in Abuja, Nigeria.`,
    { font: regular, size: 11, gapAfter: 14 }
  )

  b.drawLabelValue("Reference Number", data.referenceNumber, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Abstract Title", data.abstractTitle, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Presentation Type", data.presentationType, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Presentation Date/Time", "To be confirmed closer to the conference", { boldFont: bold, regularFont: regular, size: 10.5 })
  b.y -= 8

  b.ensureSpace(18)
  b.page.drawText("What happens next:", { x: MARGIN_X, y: b.y, size: 11, font: bold, color: INK })
  b.y -= 18

  const nextSteps = [
    "Watch for your session assignment - presentation day, date, and time will be communicated closer to the conference.",
    "Your official letter - a separate signed Letter of Invitation is available via the link already sent to you.",
  ]
  nextSteps.forEach((step, i) => {
    b.drawParagraph(`${i + 1}. ${step}`, { font: regular, size: 10.5, gapAfter: 8 })
  })
  b.y -= 6

  b.drawParagraph(
    "Embargo Policy: The findings and content of accepted abstracts should not be publicly released, published, or promoted before their scheduled presentation date at ASM Nigeria 2026. Authors are encouraged to coordinate any press or media engagement with the Scientific Programme Committee via the secretariat.",
    { font: italic, size: 9.5, color: INK_SOFT, gapAfter: 18 }
  )

  b.ensureSpace(12)
  b.page.drawText("ASM Nigeria 2026 Secretariat", { x: MARGIN_X, y: b.y, size: 12, font: bold, color: ASM_BLUE })
  b.y -= 30

  const footerLines = ["ASM Nigeria 2026 - Abuja, Nigeria", "Secretariat: asmnigeriaonehealth@gmail.com"]
  for (const line of footerLines) {
    b.ensureSpace(13)
    const w = regular.widthOfTextAtSize(line, 9)
    b.page.drawText(line, { x: MARGIN_X + (CONTENT_WIDTH - w) / 2, y: b.y, size: 9, font: regular, color: INK_SOFT })
    b.y -= 13
  }

  return b.finalize()
}

export async function generateAcceptanceLetterPdf(data: DecisionLetterData): Promise<Uint8Array> {
  const b = await LetterBuilder.create()
  const bold = await b.pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const regular = await b.pdfDoc.embedFont(StandardFonts.TimesRoman)

  b.drawParagraph("To Whom It May Concern,", { font: regular, size: 11, gapAfter: 14 })

  b.drawParagraph(
    `The American Society for Microbiology (ASM) Nigeria is pleased to confirm that the abstract submitted by ${data.authorFullName} has been accepted for ${data.presentationType} presentation at the First ASM Nigeria Conference (ASM Nigeria 2026), themed "One Health in Action: Advancing Microbial Science for Human, Animal, Environmental and Global Health," holding November 22-24, 2026 in Abuja, Nigeria.`,
    { font: regular, size: 11, gapAfter: 12 }
  )

  b.drawParagraph(
    "ASM Nigeria brings together microbial scientists, clinicians, researchers and students under the One Health approach, advancing the Society's mission to connect science with human, animal, and environmental health across Nigeria and the region.",
    { font: regular, size: 11, gapAfter: 16 }
  )

  b.drawLabelValue("Reference Number", data.referenceNumber, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Abstract Title", data.abstractTitle, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Presentation Type", data.presentationType, { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Presentation Date/Time", "To be confirmed closer to the conference", { boldFont: bold, regularFont: regular, size: 10.5 })
  b.drawLabelValue("Venue", "Conference Centre, National Open University of Nigeria, Abuja", { boldFont: bold, regularFont: regular, size: 10.5 })
  b.y -= 10

  b.drawParagraph("Congratulations, and we look forward to your participation in Abuja this November.", {
    font: regular,
    size: 11,
    gapAfter: 22,
  })

  b.ensureSpace(11)
  b.page.drawText("Sincerely,", { x: MARGIN_X, y: b.y, size: 11, font: regular, color: INK })
  b.y -= 44

  // Three signatories side by side. Kept together on one page rather than
  // letting the page break land mid-block.
  const signatories = [
    { name: "Prof. Nura Muhammad Sani", title: "Chairman, Scientific Programme Committee" },
    { name: "Dr. Stephen Dare Oloninefa", title: "Secretary, Scientific Programme Committee" },
    { name: "Dr. Abumhere S. Aziegbemhin, Ph.D.", title: "Secretary, Main Organising Committee" },
  ]
  b.ensureSpace(60)
  const colGap = 14
  const colWidth = (CONTENT_WIDTH - colGap * 2) / 3
  const sigSize = 9
  const titleSize = 7.6

  signatories.forEach((signatory, i) => {
    const colX = MARGIN_X + i * (colWidth + colGap)
    b.page.drawLine({
      start: { x: colX, y: b.y },
      end: { x: colX + colWidth - 10, y: b.y },
      thickness: 0.75,
      color: INK_SOFT,
    })
    let colY = b.y - 12
    const nameLines = wrapText(signatory.name, bold, sigSize, colWidth)
    for (const line of nameLines) {
      b.page.drawText(line, { x: colX, y: colY, size: sigSize, font: bold, color: INK })
      colY -= sigSize * 1.3
    }
    const titleLines = wrapText(signatory.title, regular, titleSize, colWidth)
    for (const line of titleLines) {
      b.page.drawText(line, { x: colX, y: colY, size: titleSize, font: regular, color: INK_SOFT })
      colY -= titleSize * 1.3
    }
  })

  return b.finalize()
}
