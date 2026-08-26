import {
  currentRegistrationPeriod,
  PARTICIPANT_CATEGORIES,
  REGISTRATION_FEES,
  REGISTRATION_PERIOD_CUTOFF,
} from "@/lib/registration-fees"

const BASE_URL = "https://www.asmnigeriaconference.com.ng"
// The bare apex domain 308-redirects to BASE_URL (single hop, verified) --
// listing it in sameAs tells consumers that don't follow redirects (some
// structured-data parsers, not browsers/crawlers) that it's the same
// organization, not a separate site.
const APEX_URL = "https://asmnigeriaconference.com.ng"

// Organization schema: identifies the conference organizer site-wide.
// Every fact here is already published elsewhere on the site (footer,
// bank transfer details, secretariat contact) -- nothing invented.
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "American Society for Microbiology (ASM) Nigeria",
    url: BASE_URL,
    sameAs: [APEX_URL],
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

// Strips the currency symbol/suffix and thousands separators so schema.org's
// numeric-string Offer.price gets e.g. "25000" from "₦25,000" or "50" from
// "$50 USD" -- REGISTRATION_FEES already carries the ISO currency separately.
function numericPrice(raw: string): string {
  return raw.replace(/[^\d.]/g, "")
}

// Event schema: the conference itself. Dates, venue, and mode all come
// straight from the constants/copy already used by the homepage hero and
// programme sections (components/marketing/landing-page.tsx).
export function ConferenceEventJsonLd() {
  const period = currentRegistrationPeriod()
  const offers = PARTICIPANT_CATEGORIES.map((category) => {
    const fee = REGISTRATION_FEES[category]
    const offer: Record<string, string> = {
      "@type": "Offer",
      name: category,
      price: numericPrice(fee[period]),
      priceCurrency: fee.currency,
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/register-conference`,
    }
    // Early-bird rates have a real, known expiry; late rates don't end
    // until the conference itself, so there's nothing honest to put here.
    if (period === "early") {
      offer.priceValidUntil = REGISTRATION_PERIOD_CUTOFF.slice(0, 10)
    }
    return offer
  })

  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Maiden ASM Nigeria Conference 2026 — One Health in Action",
    description:
      "The Maiden ASM Nigeria Conference, themed 'One Health in Action: Advancing Microbial Science for Human, Animal, Environmental, and Global Health.' A national platform for scientific exchange in microbiology, antimicrobial resistance, and One Health research.",
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
      name: "American Society for Microbiology (ASM) Nigeria",
      url: BASE_URL,
      email: "asmnigeriaonehealth@gmail.com",
    },
    // An earlier version omitted `offers` entirely because there's no
    // single ticket price -- fixed properly here instead by listing one
    // real Offer per participant category (schema.org allows an array),
    // rather than picking one tier to misrepresent as "the" price.
    offers,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// FAQ schema: plain-text mirror of the FAQS array rendered in the homepage
// accordion (components/marketing/landing-page.tsx). Kept as a separate
// plain-text copy rather than imported directly because two of those
// answers contain JSX (an inline <Link>) that schema.org's Text type can't
// hold -- update both places if the FAQ copy changes.
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        q: "Who can attend the ASM Nigeria Conference?",
        a: "The conference is open to microbiologists, researchers, clinicians, veterinarians, environmental scientists, public health professionals, students, policymakers, industry experts, and One Health stakeholders from Nigeria and beyond.",
      },
      {
        q: "Can I attend online?",
        a: "Yes! The conference is hybrid. Local online participants pay ₦25,000 (early rate) and foreign online participants pay $25 USD. You'll receive a link to the virtual platform after registration is confirmed.",
      },
      {
        q: "What is the abstract submission fee and what does it cover?",
        a: "The abstract processing fee is ₦3,000 (or $5 USD). This is separate from your conference registration fee. Payment should be made to the ASM Nigeria account at First Bank (2047664724) before or alongside your abstract submission via the official portal.",
      },
      {
        q: "What is the difference between Early and Late registration?",
        a: "Early/Regular registration is available until October 22, 2026, and offers significantly lower rates (e.g., ASM Members ₦25,000 vs ₦30,000 late). Registering early saves you money and helps the organizers plan effectively. We strongly recommend registering before October 22.",
      },
      {
        q: "What is the Pre-Conference Hands-On Workshop?",
        a: "The pre-conference workshop on November 22 is an additional paid session (₦4,000 early / ₦8,000 late) offering practical, skills-based training. It is particularly valuable for students and early-career researchers and requires separate registration.",
      },
      {
        q: "How do I confirm my payment was received?",
        a: "After making your bank transfer to First Bank (Acc: 2047664724, ASM Nigeria), attach your receipt when you register or submit your abstract — no separate email needed. The admin confirms it from your account within 2–3 working days.",
      },
      {
        q: "Can I submit more than one abstract?",
        a: "Yes, you may submit multiple abstracts. Each abstract requires a separate processing fee of ₦3,000. Each submission must meet all guidelines and address one or two of the five stated sub-themes.",
      },
    ].map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
