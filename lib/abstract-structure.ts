// The four-part abstract structure (Background / Methods / Results /
// Conclusion) and its per-section word limits. Pure functions only -- no
// server or client imports -- so the author form, the server actions, the
// display components and the Book of Abstracts export all share exactly one
// definition of what a valid structured abstract is.
//
// The four limits add up to 250, matching conferences.abstract_word_limit, so
// the existing whole-abstract cap and the per-section caps can never disagree.

export const ABSTRACT_SECTIONS = [
  {
    key: "background",
    label: "Background",
    min: 5,
    max: 35,
    hint: "Why this work matters and the gap it addresses.",
    rows: 3,
    aliases: ["background", "introduction", "aim", "aims", "objective", "objectives"],
  },
  {
    key: "methods",
    label: "Methods",
    min: 5,
    max: 80,
    hint: "Study design, samples/participants, and the key techniques used.",
    rows: 5,
    aliases: ["method", "methods", "methodology", "materials and methods"],
  },
  {
    key: "results",
    label: "Results",
    min: 5,
    max: 100,
    hint: "Your main findings, with the actual numbers or measurements.",
    rows: 6,
    aliases: ["result", "results", "findings"],
  },
  {
    key: "conclusion",
    label: "Conclusion",
    min: 5,
    max: 35,
    hint: "What the findings mean and why they matter.",
    rows: 3,
    aliases: ["conclusion", "conclusions"],
  },
] as const

export type AbstractSectionKey = (typeof ABSTRACT_SECTIONS)[number]["key"]
export type AbstractSections = Record<AbstractSectionKey, string>

// Date by which authors of already-accepted abstracts are asked to have their
// abstract restructured for the Book of Abstracts. Kept here so the author
// page and the notice emails can never quote different dates. Chosen to fall
// just before final abstract submissions close (2 Nov) and leave over three
// weeks before the conference for layout and print/PDF production.
export const BOOK_RESTRUCTURE_DEADLINE_LABEL = "Friday, 30 October 2026"

export const ABSTRACT_TOTAL_MAX = ABSTRACT_SECTIONS.reduce((sum, s) => sum + s.max, 0)

export function countWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// Authors often paste a finished abstract into the boxes, headings and all
// ("Background: ..."), or hard-wrap lines. Strip a leading label that names
// THIS section, and collapse everything to one paragraph -- the Book of
// Abstracts wants one paragraph per section, and a stray label would be
// counted as words and printed twice under the generated heading.
export function normalizeSection(key: AbstractSectionKey, raw: string) {
  const section = ABSTRACT_SECTIONS.find((s) => s.key === key)!
  let text = raw.replace(/\s+/g, " ").trim()
  const labelPattern = new RegExp(`^(?:${section.aliases.join("|")})\\s*[:\\-\\u2013\\u2014]\\s*`, "i")
  text = text.replace(labelPattern, "")
  return text.trim()
}

export function normalizeSections(raw: AbstractSections): AbstractSections {
  return {
    background: normalizeSection("background", raw.background),
    methods: normalizeSection("methods", raw.methods),
    results: normalizeSection("results", raw.results),
    conclusion: normalizeSection("conclusion", raw.conclusion),
  }
}

export function totalWords(sections: AbstractSections) {
  return ABSTRACT_SECTIONS.reduce((sum, s) => sum + countWords(sections[s.key]), 0)
}

// The single readable string stored in submission_versions.abstract_text, so
// everything that already reads that column (reviewers, committee, admin,
// notifications, older exports) keeps working with no changes.
export function composeAbstract(sections: AbstractSections) {
  return ABSTRACT_SECTIONS.map((s) => `${s.label}: ${sections[s.key]}`).join("\n\n")
}

// Returns the first problem found, or null. Expects already-normalized text.
export function checkSections(sections: AbstractSections): string | null {
  for (const s of ABSTRACT_SECTIONS) {
    const n = countWords(sections[s.key])
    if (n === 0) return `${s.label} is required.`
    if (n < s.min) return `${s.label} is too short -- write at least ${s.min} words (you have ${n}).`
    if (n > s.max) return `${s.label} is ${n} words, over its ${s.max}-word limit.`
  }
  return null
}

export function isStructured(v: {
  abstract_background?: string | null
  abstract_methods?: string | null
  abstract_results?: string | null
  abstract_conclusion?: string | null
}) {
  return Boolean(
    v.abstract_background?.trim() &&
      v.abstract_methods?.trim() &&
      v.abstract_results?.trim() &&
      v.abstract_conclusion?.trim()
  )
}

export function sectionsFromVersion(v: {
  abstract_background?: string | null
  abstract_methods?: string | null
  abstract_results?: string | null
  abstract_conclusion?: string | null
} | null): AbstractSections {
  return {
    background: v?.abstract_background ?? "",
    methods: v?.abstract_methods ?? "",
    results: v?.abstract_results ?? "",
    conclusion: v?.abstract_conclusion ?? "",
  }
}
