const BASE_URL = "https://www.asmnigeriaconference.com.ng"

// Organization schema: identifies the conference organizer site-wide.
// Every fact here is already published elsewhere on the site (footer,
// bank transfer details, secretariat contact) -- nothing invented.
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "American Society for Microbiology (ASM) Nigeria Chapter",
    url: BASE_URL,
    logo: `${BASE_URL}/brand/asm-logo.png`,
    email: "asmnigeriaonehealth@gmail.com",
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// Event schema: the conference itself. Dates, venue, and mode all come
// straight from the constants/copy already used by the homepage hero and
// programme sections (components/marketing/landing-page.tsx).
export function ConferenceEventJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "First ASM Nigeria Conference 2026 — One Health in Action",
    description:
      "The First ASM Nigeria Conference, themed 'One Health in Action: Advancing Microbial Science for Human, Animal, Environmental, and Global Health.' A national platform for scientific exchange in microbiology, antimicrobial resistance, and One Health research.",
    startDate: "2026-11-22T09:00:00+01:00",
    endDate: "2026-11-25",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: [
      {
        "@type": "Place",
        name: "Conference Centre, National Open University of Nigeria (NOUN)",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Abuja",
          addressCountry: "NG",
        },
      },
      {
        "@type": "VirtualLocation",
        url: `${BASE_URL}/register-conference`,
      },
    ],
    image: [`${BASE_URL}/brand/asm-logo.png`],
    organizer: {
      "@type": "Organization",
      name: "American Society for Microbiology (ASM) Nigeria Chapter",
      url: BASE_URL,
      email: "asmnigeriaonehealth@gmail.com",
    },
    // No `offers` block: registration has multiple fee tiers (member,
    // non-member, student, international, online) rather than one price,
    // and Event.offers expects a single representative price -- omitting
    // it avoids advertising one tier's price as "the" price.
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
