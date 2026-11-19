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
    name: "National Open University of Nigeria (NOUN)",
    logo: "/partners/noun.png",
    url: "https://nou.edu.ng",
    type: "Host Institution",
    desc: "Nigeria's foremost open and distance learning university, hosting ASM Nigeria 2026 at its Abuja headquarters.",
    fullDesc:
      "The National Open University of Nigeria (NOUN) is Nigeria's dedicated open and distance learning institution, established to widen access to quality tertiary education across the country under the motto \"Learn at any place, at your pace.\" NOUN is hosting ASM Nigeria 2026 at its Abuja campus, providing the venue and institutional support for the conference's four days of scientific sessions.",
  },
  {
    name: "Nigerian Society for Microbiology (NSM)",
    logo: "/partners/nsm.png",
    url: "https://www.nsm.ng",
    type: "Technical Partner",
    desc: "Nigeria's professional body for microbiologists, providing technical expertise and professional support to ASM Nigeria 2026.",
    fullDesc:
      "Founded in 1972, the Nigerian Society for Microbiology (NSM) is the national professional body for microbiologists in Nigeria. NSM is partnering with ASM Nigeria 2026 to provide technical expertise and professional support in areas where the collaboration can add value, in furtherance of the advancement of microbiology in Nigeria.",
  },
  {
    name: "Bayelsa Medical University",
    logo: "/partners/bayelsa-medical-university.png",
    url: "https://bmu.edu.ng",
    type: "Academic Partner",
    desc: "A Niger Delta medical university bringing clinical and public health expertise to ASM Nigeria 2026's scientific programme.",
    fullDesc:
      "Established in 2018 in Yenagoa, Bayelsa State, Bayelsa Medical University trains physicians and allied health professionals under the motto \"Ad Servitium Dei et Hominum.\" As an academic partner, the University supports ASM Nigeria 2026's scientific programme with clinical and public health expertise relevant to the conference's One Health themes.",
  },
  {
    name: "Federal University of Technology, Owerri (FUTO)",
    logo: "/partners/futo.webp",
    url: "https://futo.edu.ng",
    type: "Academic Partner",
    desc: "A leading Nigerian technology university partnering on the conference's science and biotechnology programming.",
    fullDesc:
      "The Federal University of Technology, Owerri (FUTO) is one of Nigeria's foremost science and technology institutions, operating under the motto \"Technology for Service.\" FUTO partners with ASM Nigeria 2026 to support the conference's programming on microbial science, biotechnology, and applied research.",
  },
  {
    name: "BusinessDay",
    logo: "/partners/businessday.jpg",
    url: "https://businessday.ng",
    type: "Media Partner",
    desc: "Nigeria's leading business and economy newspaper, providing media coverage for ASM Nigeria 2026.",
    fullDesc:
      "BusinessDay is one of Nigeria's leading business, economy and policy-focused newspapers. As a media partner, BusinessDay is providing press coverage and visibility for ASM Nigeria 2026 across its print and digital platforms.",
  },
  {
    name: "Healths.NG Media Limited",
    logo: "/partners/healthsng-media.png",
    url: "https://healths.ng",
    type: "Media Partner",
    desc: "A health-focused Nigerian media outlet providing coverage for ASM Nigeria 2026.",
    fullDesc:
      "Healths.NG Media Limited is a Nigerian media outlet dedicated to health and healthcare-sector reporting. As a media partner, Healths.NG is providing press coverage and amplification for ASM Nigeria 2026 across its platforms.",
  },
]
