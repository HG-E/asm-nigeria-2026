import "server-only"

import ExcelJS from "exceljs"

export type ExportCell = string | number | null

function escapeCsvCell(cell: ExportCell): string {
  const value = cell === null || cell === undefined ? "" : String(cell)
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function toCsv(headers: string[], rows: ExportCell[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","))
  }
  // Leading BOM so Excel opens UTF-8 CSVs (accented names, naira sign) correctly.
  return "﻿" + lines.join("\r\n")
}

export async function toXlsx(
  headers: string[],
  rows: ExportCell[][],
  sheetName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31))
  sheet.addRow(headers)
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) {
    sheet.addRow(row)
  }
  sheet.columns.forEach((column) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0
      if (length > maxLength) maxLength = length
    })
    column.width = Math.min(maxLength + 2, 60)
  })
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// base64, not a Buffer -- exceljs's own Image type pins a Buffer shape from
// an older @types/node that this project's Buffer doesn't structurally
// match, so base64 sidesteps the mismatch entirely.
export type EmbeddedImage = { base64: string; extension: "jpeg" | "png" } | null

// Same shape as toXlsx, but with a leading "Photo" column holding an actual
// embedded image per row (not a link) -- images[i] corresponds to rows[i].
// A missing/null entry just leaves that row's photo cell blank.
export async function toXlsxWithImages(
  headers: string[],
  rows: ExportCell[][],
  sheetName: string,
  images: EmbeddedImage[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31))
  sheet.addRow(["Photo", ...headers])
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn(1).width = 12

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow(["", ...row])
    excelRow.height = 56

    const image = images[i]
    if (image) {
      const imageId = workbook.addImage(image)
      // Row index here is 0-based from the top of the sheet; header occupies
      // row 0, so data row i sits at row (i + 1).
      sheet.addImage(imageId, {
        tl: { col: 0.08, row: i + 1.08 },
        ext: { width: 52, height: 52 },
      })
    }
  })

  sheet.columns.forEach((column, idx) => {
    if (idx === 0) return
    let maxLength = 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0
      if (length > maxLength) maxLength = length
    })
    column.width = Math.min(maxLength + 2, 60)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
