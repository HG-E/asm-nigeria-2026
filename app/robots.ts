import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/author/", "/reviewer/", "/committee/", "/admin/", "/reset-password", "/auth/"],
    },
    sitemap: "https://www.asmnigeriaconference.com.ng/sitemap.xml",
  }
}
