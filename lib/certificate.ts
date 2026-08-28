import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

// Template is 5250x3712px (Canva export), which is almost exactly the A4
// ratio (1.4142:1) -- rendered onto a real A4-landscape PDF page so it
// prints at correct physical size. Box coordinates below were calibrated
// directly against the template image (drew a debug rectangle, compared
// against the actual gold-bordered name box and the blank line in the
// top-right corner, adjusted until they matched) rather than eyeballed
// from the pixel grid alone.
const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

// Both boxes given as { left, top, width, height } in PDF points, with
// `top` measured from the top of the page (converted to PDF's
// bottom-origin coordinate system at draw time).
const NAME_BOX = { left: 80.8, top: 216.8, width: 681.2, height: 54.7 }
const NUMBER_LINE = { left: 581.0, top: 82.1, width: 181.0, height: 16.8 }

export async function generateParticipationCertificate(params: {
  fullName: string
  certificateNumber: string
}): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public/certificates/participation-template.png")
  const templateBytes = await readFile(templatePath)

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const templateImage = await pdfDoc.embedPng(templateBytes)
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const numberFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Name: centered in the box, sized down to fit if it's a long name.
  let nameSize = 26
  while (nameFont.widthOfTextAtSize(params.fullName, nameSize) > NAME_BOX.width - 24 && nameSize > 12) {
    nameSize -= 1
  }
  const nameWidth = nameFont.widthOfTextAtSize(params.fullName, nameSize)
  const nameX = NAME_BOX.left + (NAME_BOX.width - nameWidth) / 2
  const nameBaselineY = PAGE_HEIGHT - NAME_BOX.top - NAME_BOX.height / 2 - nameSize * 0.35
  page.drawText(params.fullName, {
    x: nameX,
    y: nameBaselineY,
    size: nameSize,
    font: nameFont,
    color: rgb(0.02, 0.09, 0.24), // matches the certificate's ink-blue body text
  })

  // Certificate number: small, right-aligned, sitting just above the line.
  const numberLabel = `Certificate No: ${params.certificateNumber}`
  const numberSize = 9
  const numberWidth = numberFont.widthOfTextAtSize(numberLabel, numberSize)
  const numberX = NUMBER_LINE.left + NUMBER_LINE.width - numberWidth
  const numberBaselineY = PAGE_HEIGHT - NUMBER_LINE.top - NUMBER_LINE.height + 11
  page.drawText(numberLabel, {
    x: numberX,
    y: numberBaselineY,
    size: numberSize,
    font: numberFont,
    color: rgb(0.25, 0.29, 0.42),
  })

  return pdfDoc.save()
}
