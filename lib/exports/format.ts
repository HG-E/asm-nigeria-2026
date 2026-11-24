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
  return toXlsxMultiSheet([{ name: sheetName, headers, rows }])
}

// One worksheet per entry -- e.g. one per subtheme, so a grouped download
// reads as distinct sections in Excel's sheet tabs rather than one long
// flat list the admin has to re-sort themselves.
export async function toXlsxMultiSheet(
  sheets: { name: string; headers: string[]; rows: ExportCell[][] }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const usedNames = new Set<string>()
  for (const { name, headers, rows } of sheets) {
    // Excel sheet names: max 31 chars, no \ / ? * [ ] colons, and must be
    // unique within the workbook -- two subthemes that only differ past
    // character 31 would otherwise collide and silently overwrite each
    // other's sheet.
    let safeName = name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Sheet"
    let suffix = 2
    while (usedNames.has(safeName)) {
      const base = name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31 - String(suffix).length - 1)
      safeName = `${base}-${suffix}`
      suffix += 1
    }
    usedNames.add(safeName)

    const sheet = workbook.addWorksheet(safeName)
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
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// base64, not a Buffer -- exceljs's own Image type pins a Buffer shape from
// an older @types/node that this project's Buffer doesn't structurally
// match, so base64 sidesteps the mismatch entirely.
export type EmbeddedImage = { base64: string; extension: "jpeg" | "png" } | null

export type ImageColumn = { label: string; images: EmbeddedImage[] }

// Same shape as toXlsx, but with one or more leading columns holding an
// actual embedded image per row (not a link) -- column.images[i]
// corresponds to rows[i]. A missing/null entry just leaves that row's cell
// blank for that column.
export async function toXlsxWithImages(
  headers: string[],
  rows: ExportCell[][],
  sheetName: string,
  imageColumns: ImageColumn[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31))
  const leadingCount = imageColumns.length
  sheet.addRow([...imageColumns.map((c) => c.label), ...headers])
  sheet.getRow(1).font = { bold: true }
  for (let col = 1; col <= leadingCount; col++) sheet.getColumn(col).width = 12

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow([...imageColumns.map(() => ""), ...row])
    excelRow.height = 56

    imageColumns.forEach((column, colIndex) => {
      const image = column.images[i]
      if (!image) return
      const imageId = workbook.addImage(image)
      // Row index here is 0-based from the top of the sheet; header occupies
      // row 0, so data row i sits at row (i + 1). Column index is likewise
      // 0-based, so the first image column sits at col 0, the second at 1, etc.
      sheet.addImage(imageId, {
        tl: { col: colIndex + 0.08, row: i + 1.08 },
        ext: { width: 52, height: 52 },
      })
    })
  })

  sheet.columns.forEach((column, idx) => {
    if (idx < leadingCount) return
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
