// Single source of truth for award honorees -- shared by the homepage
// teaser and the dedicated /awardees page, same pattern as speakers-data.ts.
// Lighter than a Speaker entry on purpose: just who they are, what they're
// being recognized for, and a photo -- no bio paragraph.
export type Awardee = {
  accent: string
  initials: string
  image: string
  chip: string
  chipLabel: string // the award/category, e.g. "Lifetime Achievement Award"
  name: string
}

// Add an entry here only once an award is actually confirmed, never as a
// placeholder -- empty on purpose until the real list is provided.
export const AWARDEES: Awardee[] = []
