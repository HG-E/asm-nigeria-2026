import type { MetadataRoute } from "next"

const BASE_URL = "https://www.asmnigeriaconference.com.ng"

export default function sitemap(): MetadataRoute.Sitemap {
  // The homepage genuinely changes often (programme, fees, speakers), so
  // build time is an honest lastModified for it. The others are set to
  // when their content actually last changed rather than a blanket "now"
  // on every deploy -- an always-fresh lastmod on pages that rarely change
  // (terms, privacy) trains crawlers to ignore the field as meaningless.
  const now = new Date()

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/register`, lastModified: new Date("2026-08-21"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/register-conference`, lastModified: new Date("2026-08-21"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/terms`, lastModified: new Date("2026-08-21"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date("2026-08-20"), changeFrequency: "yearly", priority: 0.2 },
  ]
}
