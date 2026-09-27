// Inline formatting for abstract text (titles, the four abstract sections,
// keywords): italic, bold, underline, superscript, subscript -- what a
// microbiologist needs for organism names (Escherichia coli), gene names
// (mecA), 10^6 CFU/ml, CO2 and so on.
//
// Stored form: plain text with a tiny allow-list of tags -- <i> <b> <u> <sup>
// <sub> -- and nothing else. Every other "<" and bare "&" is kept as literal
// text, so an abstract that says "p < 0.05" or "R&D" needs no escaping and
// every abstract written before this feature (which has no tags at all) is
// already valid and reads exactly as it always did.
//
// The same parser feeds everything that shows or exports the text: the React
// renderer, the editor (as its starting content), the plain-text derivation
// used for word counts / emails / search, and the Word export. Nothing ever
// injects this string into the page as HTML.
//
// Pure functions only -- no server or client imports -- so browser and server
// share one definition.

export type RichMark = "b" | "i" | "u" | "sup" | "sub"

export type RichRun = { text: string; marks: RichMark[] }

// Fixed nesting order, so the same formatting always serializes identically
// (which is what makes "did only the formatting change?" a reliable question).
const MARK_ORDER: RichMark[] = ["b", "i", "u", "sup", "sub"]

const TAG_PATTERN = /<(\/?)(b|i|u|sup|sub|em|strong)>/gi
const ALIAS: Record<string, RichMark> = {
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  u: "u",
  sup: "sup",
  sub: "sub",
}

const MAX_LENGTH = 20000

// Only these three entities are ever produced by escapeText, and only these
// are decoded (in one pass, so "&amp;lt;" reads back as the literal "&lt;").
const ENTITY: Record<string, string> = { lt: "<", gt: ">", amp: "&" }
function decodeEntities(text: string) {
  return text.replace(/&(lt|gt|amp);/g, (_, name: string) => ENTITY[name])
}

// Parses stored text into runs of text sharing the same set of marks.
// Tolerant by design: unbalanced or stray tags never throw and never leak.
export function parseRich(input: string | null | undefined): RichRun[] {
  const source = (input ?? "").slice(0, MAX_LENGTH)
  const runs: RichRun[] = []
  const open = new Set<RichMark>()

  const push = (raw: string) => {
    if (!raw) return
    const text = decodeEntities(raw)
    const marks = MARK_ORDER.filter((m) => open.has(m))
    const last = runs[runs.length - 1]
    if (last && last.marks.length === marks.length && last.marks.every((m, i) => m === marks[i])) {
      last.text += text
    } else {
      runs.push({ text, marks })
    }
  }

  let cursor = 0
  for (const match of source.matchAll(TAG_PATTERN)) {
    push(source.slice(cursor, match.index))
    cursor = match.index + match[0].length
    const mark = ALIAS[match[2].toLowerCase()]
    if (match[1]) open.delete(mark)
    else open.add(mark)
  }
  push(source.slice(cursor))
  return runs
}

// Minimal escaping: only what would otherwise be misread on the way back in.
// "p < 0.05" and "R&D" are therefore stored exactly as typed, the same as
// every abstract written before formatting existed.
function escapeText(text: string) {
  return text
    .replace(/&(?=(?:lt|gt|amp);)/g, "&amp;")
    .replace(/<(?=\/?(?:b|i|u|sup|sub|em|strong)>)/gi, "&lt;")
}

// Runs -> stored string. Marks are opened/closed around each run in the fixed
// order; adjacent runs with identical marks were already merged by the parser.
export function serializeRich(runs: RichRun[]): string {
  let out = ""
  for (const run of runs) {
    if (!run.text) continue
    let piece = escapeText(run.text)
    for (const mark of [...run.marks].reverse()) piece = `<${mark}>${piece}</${mark}>`
    out += piece
  }
  return out
}

// Canonical form of anything: parse, drop empty formatting, re-serialize.
// Applied on every save, so what is stored is always well-formed and safe no
// matter what the client sent.
export function normalizeRich(input: string | null | undefined): string {
  return serializeRich(parseRich(input))
}

// The words alone -- what word counts, emails, notifications, search and the
// "was only the formatting changed?" check should read.
export function toPlain(input: string | null | undefined): string {
  return parseRich(input)
    .map((r) => r.text)
    .join("")
}

// Collapse whitespace the way abstract normalization does, for comparing two
// versions of the same text.
export function plainKey(input: string | null | undefined): string {
  return toPlain(input).replace(/\s+/g, " ").trim()
}

// True if any formatting is present at all.
export function hasFormatting(input: string | null | undefined): boolean {
  return parseRich(input).some((r) => r.marks.length > 0)
}

// Whitespace collapse that keeps the formatting (used by section
// normalization): collapses runs of whitespace across run boundaries and trims
// the ends, then re-serializes.
export function collapseRichWhitespace(input: string | null | undefined): string {
  const runs = parseRich(input).map((r) => ({ ...r, text: r.text.replace(/\s+/g, " ") }))
  // Collapse a space that follows a space in the previous run.
  for (let i = 1; i < runs.length; i++) {
    if (runs[i - 1].text.endsWith(" ") && runs[i].text.startsWith(" ")) runs[i].text = runs[i].text.slice(1)
  }
  if (runs.length) runs[0].text = runs[0].text.replace(/^ /, "")
  if (runs.length) runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/ $/, "")
  return serializeRich(runs.filter((r) => r.text))
}

// Removes a leading "Background:"-style label that names this section,
// keeping formatting on the remaining text. Operates on the plain text prefix.
export function stripLeadingLabel(input: string, pattern: RegExp): string {
  const runs = parseRich(input)
  const plain = runs.map((r) => r.text).join("")
  const match = plain.match(pattern)
  if (!match || match.index !== 0) return input
  let toRemove = match[0].length
  const next: RichRun[] = []
  for (const run of runs) {
    if (toRemove <= 0) {
      next.push(run)
      continue
    }
    if (run.text.length <= toRemove) {
      toRemove -= run.text.length
      continue
    }
    next.push({ ...run, text: run.text.slice(toRemove) })
    toRemove = 0
  }
  return serializeRich(next)
}

// Safe HTML for emails: text is escaped, and only the five allowed formats
// become tags. Email clients render <i>, <b>, <u>, <sup> and <sub>, so a title
// keeps its italics in the notification a reviewer or author receives.
export function toHtml(input: string | null | undefined): string {
  return parseRich(input)
    .map((run) => {
      let html = run.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      for (const mark of [...run.marks].reverse()) html = `<${mark}>${html}</${mark}>`
      return html
    })
    .join("")
}
