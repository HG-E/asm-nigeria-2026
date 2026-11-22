// Single source of truth for the ten planning subcommittee names, shared by
// the homepage's Planning Committee section (components/marketing/
// landing-page.tsx's SUBCOMMITTEES) and the committee-member registration
// form's subcommittee dropdown, so the two lists can't drift apart.
export const SUBCOMMITTEE_NAMES = [
  "Scientific Programme Committee",
  "Finance and Budget Committee",
  "Sponsorship and Fundraising Committee",
  "Publicity, Media and Communications Committee",
  "Registration and Accreditation Committee",
  "Protocol and Hospitality Committee",
  "Logistics, Transportation and Venue Committee",
  "Technical and ICT Committee",
  "Volunteer Coordination Committee",
  "Exhibition, Partnerships and Industry Engagement Committee",
] as const

export type SubcommitteeName = (typeof SUBCOMMITTEE_NAMES)[number]
