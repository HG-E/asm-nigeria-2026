// Confirmed partners/sponsors of ASM Nigeria 2026 -- shared by the homepage
// "Partnership & Sponsorship" section and the dedicated /partners page, so
// the two can never list different organizations. Add an entry here only
// once a partnership is actually confirmed (e.g. by a signed letter), never
// as a placeholder.
export type Partner = {
  name: string
  logo: string
  url: string
  type: string // short badge, e.g. "Technical Partner"
  desc: string // one line, for the homepage card
  fullDesc: string // a short paragraph, for the /partners page
}

export const PARTNERS: Partner[] = [
  {
    name: "Nigerian Society for Microbiology (NSM)",
    logo: "/partners/nsm.png",
    url: "https://www.nsm.ng",
    type: "Technical Partner",
    desc: "Nigeria's professional body for microbiologists, providing technical expertise and professional support to ASM Nigeria 2026.",
    fullDesc:
      "Founded in 1972, the Nigerian Society for Microbiology (NSM) is the national professional body for microbiologists in Nigeria. NSM is partnering with ASM Nigeria 2026 to provide technical expertise and professional support in areas where the collaboration can add value, in furtherance of the advancement of microbiology in Nigeria.",
  },
]
