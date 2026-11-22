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
  title: string
}

// Add an entry here only once an award is actually confirmed, never as a
// placeholder.
export const AWARDEES: Awardee[] = [
  {
    accent: "var(--red)",
    initials: "KU",
    image: "/speakers/kingsley-udeh.jpg",
    chip: "chip-red",
    chipLabel: "Excellence in Public Service Award",
    name: "Dr. Kingsley Tochukwu Udeh, SAN",
    title: "Minister of Innovation, Science & Technology",
  },
  {
    accent: "var(--blue)",
    initials: "UU",
    image: "/speakers/uduma-oji-uduma.jpg",
    chip: "chip-blue",
    chipLabel: "Excellence in Academic Leadership and Mentorship Award",
    name: "Prof. Uduma Oji Uduma",
    title: "Vice-Chancellor, National Open University of Nigeria (NOUN)",
  },
  {
    accent: "var(--gold)",
    initials: "ID",
    image: "/speakers/ikechukwu-dozie.jpg",
    chip: "chip-gold",
    chipLabel: "Excellence in Academic Leadership and Mentorship Award",
    name: "Prof. Ikechukwu Nosike Simplicius Dozie",
    title: "Vice-Chancellor, Federal University of Technology, Owerri (FUTO)",
  },
  {
    accent: "var(--red)",
    initials: "CE",
    image: "/speakers/christopher-eze.jpg",
    chip: "chip-red",
    chipLabel: "Excellence in Academic Leadership and Mentorship Award",
    name: "Prof. Christopher Chiedozie Eze",
    title: "Acting Vice-Chancellor, University of Agriculture and Environmental Sciences, Umuagwo, Imo State",
  },
  {
    accent: "var(--red)",
    initials: "AM",
    image: "/speakers/abdullahi-mustapha.jpg",
    chip: "chip-red",
    chipLabel: "Excellence in Scientific Leadership and Innovation Award",
    name: "Professor Abdullahi Mustapha",
    title: "Director-General/CEO, National Biotechnology Research and Development Agency (NBRDA), Abuja",
  },
  {
    accent: "var(--blue)",
    initials: "EE",
    image: "",
    chip: "chip-blue",
    chipLabel: "Excellence in Clinical Practice (Lab to Landscape) Leadership",
    name: "Dr. Emeka Elom",
    title: "Director, Medical Laboratory Services, Department of Hospital Services, Federal Ministry of Health and Social Welfare",
  },
  {
    accent: "var(--gold)",
    initials: "SA",
    image: "/speakers/sa-ado.jpg",
    chip: "chip-gold",
    chipLabel: "Distinguished Leadership and Service to Microbiology Award",
    name: "Professor S. A. Ado",
    title: "President, Nigerian Society for Microbiology (NSM)",
  },
  {
    accent: "var(--gold)",
    initials: "BO",
    image: "/speakers/bethrand-odume.jpg",
    chip: "chip-gold",
    chipLabel: "Excellence in Academic and Clinical Leadership Award",
    name: "Professor Bethrand Brian Odume",
    title: "Executive Director, KNCV Nigeria, Abuja",
  },
  {
    accent: "var(--blue)",
    initials: "RM",
    image: "/speakers/robert-metcalf.jpg",
    chip: "chip-blue",
    chipLabel: "Distinguished Award for Translational Microbiology and One Health Impact",
    name: "Professor Robert Metcalf",
    title: "Professor Emeritus, Biological Sciences, California State University, Sacramento",
  },
]
