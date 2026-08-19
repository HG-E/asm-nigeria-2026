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
