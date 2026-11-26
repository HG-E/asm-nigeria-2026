import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

// Portrait A4, unlike the landscape certificates -- a receipt reads as a
// business document, not a decorative award, and this project's other
// printable/downloadable business documents (none yet) would also expect
// portrait.
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

const INK = rgb(0.02, 0.09, 0.24)
const MUTED = rgb(0.34, 0.38, 0.47)
const RED = rgb(0.8, 0.13, 0.16)
const GOLD = rgb(0.96, 0.66, 0)
const BLUE = rgb(0, 0.19, 0.53)
const GREEN = rgb(0.09, 0.47, 0.32)
const LINE = rgb(0.85, 0.87, 0.91)
const PAID_BG = rgb(0.9, 0.96, 0.92)
const PAID_TEXT = rgb(0.09, 0.47, 0.32)

// pdf-lib's standard fonts use WinAnsi encoding (~Latin-1) -- drawText
// throws outright on any character outside it, rather than skipping or
// substituting. "₦" (U+20A6) is the one guaranteed to appear (every
// amount_expected uses it), but a name, institution or email could just as
// easily contain a smart quote, an em dash, or a non-Latin character pasted
// from somewhere else, and any one of those would crash the whole receipt
// download rather than degrade gracefully. Known substitutions first, then
// anything still outside Latin-1 is dropped rather than left to throw.
function pdfSafeText(text: string): string {
  return text
    .replaceAll("₦", "NGN ")
    .replaceAll(/[‘’]/g, "'")
    .replaceAll(/[“”]/g, '"')
    .replaceAll(/[–—]/g, "-")
    .replace(/[^\u0000-ÿ]/g, "")
}

function drawColorBand(page: PDFPage, y: number) {
  const colors = [RED, BLUE, GOLD, GREEN]
  const segmentWidth = PAGE_WIDTH / colors.length
  colors.forEach((color, i) => {
    page.drawRectangle({ x: i * segmentWidth, y, width: segmentWidth, height: 6, color })
  })
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  labelFont: PDFFont,
  valueFont: PDFFont
) {
  page.drawText(label.toUpperCase(), { x, y, size: 8.5, font: labelFont, color: MUTED })
  page.drawText(pdfSafeText(value), { x, y: y - 16, size: 11.5, font: valueFont, color: INK })
}

export async function generatePaymentReceipt(params: {
  fullName: string
  email: string
  phone: string | null
  institution: string | null
  participantCategory: string
  registrationPeriod: string
  amountExpected: string
  referenceNumber: string
  issuedAt: Date
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  drawColorBand(page, PAGE_HEIGHT - 6)
  drawColorBand(page, 0)

  const logoPath = path.join(process.cwd(), "public/brand/asm-logo.png")
  const logoBytes = await readFile(logoPath)
  const logoImage = await pdfDoc.embedPng(logoBytes)
  const logoScale = 90 / logoImage.width
  page.drawImage(logoImage, {
    x: 48,
    y: PAGE_HEIGHT - 46 - logoImage.height * logoScale,
    width: logoImage.width * logoScale,
    height: logoImage.height * logoScale,
  })

  page.drawText("OFFICIAL PAYMENT RECEIPT", {
    x: PAGE_WIDTH - 48 - bold.widthOfTextAtSize("OFFICIAL PAYMENT RECEIPT", 15),
    y: PAGE_HEIGHT - 60,
    size: 15,
    font: bold,
    color: INK,
  })
  const subtitle = "First ASM Nigeria Conference 2026"
  page.drawText(subtitle, {
    x: PAGE_WIDTH - 48 - regular.widthOfTextAtSize(subtitle, 10),
    y: PAGE_HEIGHT - 76,
    size: 10,
    font: regular,
    color: MUTED,
  })

  let y = PAGE_HEIGHT - 150
  page.drawLine({ start: { x: 48, y }, end: { x: PAGE_WIDTH - 48, y }, thickness: 1, color: LINE })

  y -= 36
  drawLabelValue(page, "Receipt No.", params.referenceNumber, 48, y, bold, regular)
  const dateLabel = params.issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
  drawLabelValue(page, "Date Issued", dateLabel, 320, y, bold, regular)

  y -= 56
  drawLabelValue(page, "Received From", params.fullName, 48, y, bold, bold)
  drawLabelValue(page, "Email", params.email, 320, y, bold, regular)

  y -= 56
  drawLabelValue(page, "Phone", params.phone ?? "—", 48, y, bold, regular)
  drawLabelValue(page, "Institution", params.institution ?? "—", 320, y, bold, regular)

  y -= 56
  drawLabelValue(page, "Participant Category", params.participantCategory, 48, y, bold, regular)
  drawLabelValue(
    page,
    "Registration Period",
    params.registrationPeriod === "early" ? "Early / Regular" : "Late",
    320,
    y,
    bold,
    regular
  )

  // Amount block
  y -= 70
  page.drawRectangle({ x: 48, y: y - 54, width: PAGE_WIDTH - 96, height: 70, color: rgb(0.96, 0.97, 0.99) })
  page.drawText("AMOUNT PAID", { x: 64, y: y - 2, size: 9, font: bold, color: MUTED })
  const amountText = pdfSafeText(params.amountExpected)
  const amountMaxWidth = PAGE_WIDTH - 96 - 32
  let amountSize = 22
  while (bold.widthOfTextAtSize(amountText, amountSize) > amountMaxWidth && amountSize > 12) {
    amountSize -= 1
  }
  page.drawText(amountText, { x: 64, y: y - 30, size: amountSize, font: bold, color: INK })

  const paidLabel = "PAID"
  const paidWidth = bold.widthOfTextAtSize(paidLabel, 11)
  const badgeX = PAGE_WIDTH - 64 - paidWidth - 24
  page.drawRectangle({ x: badgeX, y: y - 32, width: paidWidth + 24, height: 24, color: PAID_BG })
  page.drawText(paidLabel, { x: badgeX + 12, y: y - 24, size: 11, font: bold, color: PAID_TEXT })

  y -= 100
  page.drawText("Payment received for registration with the Maiden American Society for", {
    x: 48,
    y,
    size: 10.5,
    font: regular,
    color: INK,
  })
  y -= 15
  page.drawText("Microbiology Nigeria Conference 2026, 22-25 November 2026, Abuja, Nigeria.", {
    x: 48,
    y,
    size: 10.5,
    font: regular,
    color: INK,
  })

  // Footer
  const footerY = 150
  page.drawLine({ start: { x: 48, y: footerY }, end: { x: PAGE_WIDTH - 48, y: footerY }, thickness: 1, color: LINE })
  page.drawText("This is a computer-generated receipt confirming your verified payment. It does not require a", {
    x: 48,
    y: footerY - 24,
    size: 9,
    font: italic,
    color: MUTED,
  })
  page.drawText("signature or stamp to be valid.", {
    x: 48,
    y: footerY - 37,
    size: 9,
    font: italic,
    color: MUTED,
  })
  page.drawText("ASM Nigeria 2026 Finance & Budget Committee", {
    x: 48,
    y: footerY - 64,
    size: 10,
    font: bold,
    color: RED,
  })
  page.drawText("asmnigeriaonehealth@gmail.com", {
    x: 48,
    y: footerY - 79,
    size: 9.5,
    font: regular,
    color: MUTED,
  })

  return pdfDoc.save()
}
