import "server-only"

// A minimal RFC4180-ish CSV parser: handles quoted fields, commas and
// newlines inside quotes, and "" as an escaped quote. Good enough for a
// Google Sheets "publish to web as CSV" export, which is all this is for --
// not a general-purpose CSV library.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\r") {
      // ignore -- the matching \n (or its absence) ends the row
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""))
}

// Parses a CSV with a header row into an array of plain objects keyed by
// that header -- the header names are whatever the Google Form's question
// titles were, so callers match them loosely (see findColumn below), not by
// an assumed exact name.
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const [headers, ...dataRows] = rows
  return dataRows.map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((h, i) => {
      record[h] = row[i] ?? ""
    })
    return record
  })
}

// Finds the actual header name in a record whose text loosely matches one
// of the given keywords (case-insensitive substring) -- Google Form column
// headers are exactly whatever the question was titled, which this app
// doesn't control, so exact-name matching would be too brittle.
export function findColumn(record: Record<string, string>, keywords: string[]): string | null {
  const headers = Object.keys(record)
  for (const keyword of keywords) {
    const match = headers.find((h) => h.toLowerCase().includes(keyword.toLowerCase()))
    if (match) return match
  }
  return null
}
