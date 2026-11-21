// Exhibitors showcase their own artwork as a single image (unlike PARTNERS,
// there's no card copy to write -- the organization supplied finished
// marketing artwork, not a logo + description pair).
export type Exhibitor = {
  name: string
  image: string
  url: string
  phone: string
}

export const EXHIBITORS: Exhibitor[] = [
  {
    name: "African Medical Centre of Excellence (AMCE)",
    image: "/partners/amce-exhibitor.jpg",
    url: "https://www.amce.net/",
    phone: "+2347073940063",
  },
]
