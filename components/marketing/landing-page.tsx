"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { submitContactMessageAction } from "@/app/contact-actions"
import { Reveal } from "@/components/marketing/reveal"

import "./landing.css"

const BANNER_DISMISS_KEY = "asm-2026-urgency-banner-dismissed-aug22"
const SECRETARIAT_EMAIL = "asmnigeriaonehealth@gmail.com"
const CONFERENCE_DATE = new Date("2026-11-22T09:00:00+01:00").getTime()
const EARLY_DEADLINE = new Date("2026-08-30T22:59:59+00:00").getTime()

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0")
}

function splitCountdown(msRemaining: number) {
  const ms = Math.max(0, msRemaining)
  return {
    d: pad(Math.floor(ms / 86400000)),
    h: pad(Math.floor((ms % 86400000) / 3600000)),
    m: pad(Math.floor((ms % 3600000) / 60000)),
    s: pad(Math.floor((ms % 60000) / 1000)),
  }
}

// This page is statically generated, so "now" at build time and "now" at
// page load can be hours or days apart -- computing the countdown in the
// initial state (which also runs during SSR) would make the server-rendered
// digits mismatch whatever the client renders on hydration. Starting from
// this placeholder (matching the original static site's own "--" loading
// state) keeps server and client output identical, and the real numbers
// land a moment later via the client-only useEffect below.
const PENDING_COUNTDOWN = { d: "--", h: "--", m: "--", s: "--" }

const WHY_CARDS = [
  { icon: "🔬", accent: "wi-red", title: "World-Class Science", desc: "Keynote lectures, plenary sessions, oral and poster presentations delivering cutting-edge microbiology research." },
  { icon: "🤝", accent: "wi-blue", title: "Network Across Sectors", desc: "Connect with microbiologists, clinicians, vets, environmental scientists, policymakers and industry leaders under one roof." },
  { icon: "🌍", accent: "wi-gold", title: "One Health Framework", desc: "Experience Africa's first conference fully built around the One Health paradigm — human, animal, and environment together." },
  { icon: "🎓", accent: "wi-red", title: "Student & ECR Focus", desc: "Dedicated mentorship sessions, early-career researcher support, and a pre-conference hands-on workshop for skills development." },
  { icon: "📢", accent: "wi-blue", title: "Policy Dialogue", desc: "Shape Nigeria's science policy through evidence-based discussions with government stakeholders and industry leaders." },
  { icon: "💡", accent: "wi-gold", title: "AI & Innovation", desc: "Explore how biotechnology and artificial intelligence are revolutionising sustainable microbiology in Africa and beyond." },
]

const PARTNER_BENEFITS = [
  { icon: "🎯", accent: "wi-red", title: "Brand Visibility", desc: "Logo and brand placement across the venue, programme, and digital materials in front of a national scientific audience." },
  { icon: "🤝", accent: "wi-blue", title: "Direct Networking", desc: "Exhibition space and direct access to researchers, clinicians, students, and decision-makers attending the conference." },
  { icon: "🎤", accent: "wi-gold", title: "Thought Leadership", desc: "Speaking and panel opportunities to position your organization at the center of One Health conversations in Nigeria." },
  { icon: "🌱", accent: "wi-red", title: "CSR & Community Impact", desc: "Support mentorship, student attendance, and scientific capacity-building as part of your organization's community impact." },
]

// Confirmed partners/sponsors -- empty until real ones are signed on, so
// the carousel below simply doesn't render rather than showing placeholder
// or fabricated brands. Add entries here as partnerships are confirmed:
// { name: "Acme Diagnostics", logo: "/partners/acme.png", url: "https://acme.example", desc: "One-line description of what they do." }
type Partner = { name: string; logo: string; url: string; desc: string }
const PARTNERS: Partner[] = []

const SPEAKERS = [
  {
    accent: "var(--red)",
    initials: "KE",
    image: "/speakers/kehinde-eniola.jpg",
    chip: "chip-red",
    chipLabel: "Keynote Speaker",
    name: "Prof. Kehinde I.T. Eniola",
    title: "Vice Chancellor",
    sub: "Kogi State University, Kabba",
    bio: "",
  },
  {
    accent: "var(--gold)",
    initials: "SA",
    image: "/speakers/sylvia-anyadoh-nwadike.jpg",
    chip: "chip-gold",
    chipLabel: "Conference Convener",
    name: "Sylvia O. Anyadoh-Nwadike, PhD",
    title: "ASM Country Ambassador to Nigeria",
    sub: null,
    bio: "",
  },
]

const THEMES = [
  {
    num: 1,
    bg: "var(--red)",
    title: "Combating Antimicrobial Resistance through One Health Approaches",
    desc: "Antimicrobial resistance remains one of the most urgent threats to global health, cutting across human medicine, veterinary practice, agriculture, and the environment. This subtheme invites contributions on AMR surveillance and stewardship, novel antimicrobials and diagnostics, and the environmental and food-chain reservoirs that sustain resistance, with particular attention to integrated, cross-sectoral strategies for containment.",
    topics: [
      "AMR surveillance",
      "Antimicrobial stewardship",
      "Novel antimicrobials and diagnostics",
      "Environmental reservoirs of resistance",
      "Antimicrobial resistance along the food chain",
      "One Health approaches to AMR in agriculture",
      "Veterinary antibiotic use and food safety",
    ],
  },
  {
    num: 2,
    bg: null,
    title: "Emerging and Re-emerging Infectious Diseases: Preparedness, Surveillance and Response",
    desc: "As zoonotic spillover and outbreak risk intensify globally, this sub-theme focuses on the science and systems needed for early detection and rapid response. Topics include genomic epidemiology, public health microbiology, laboratory strengthening, wastewater-based surveillance, and WASH interventions that build community-level resilience against infectious threats.",
    topics: [
      "Outbreak preparedness",
      "Zoonotic diseases",
      "Genomic epidemiology",
      "Public health microbiology",
      "Laboratory strengthening",
      "Wastewater surveillance for public health and disease monitoring",
      "WASH interventions for sustainable communities",
    ],
  },
  {
    num: 3,
    bg: "rgba(255,255,255,.15)",
    title: "From Lab to Landscape — Translating Microbial Science into Resilient One Health Systems and Governance",
    desc: "Laboratory discovery only delivers public value when it is translated into policy, regulation, and ecological stewardship. This sub-theme welcomes work on science-to-policy translation and One Health governance frameworks, alongside research treating soil, water, and gut microbiomes as shared infrastructure whose resilience underpins both ecosystem stability and human/animal health outcomes.",
    topics: [
      "Science-to-policy translation and evidence-based One Health governance",
      "Soil, water, and gut microbiomes as shared ecological infrastructure",
      "Cross-sectoral regulatory frameworks linking environmental and human/animal health",
      "Microbiome resilience as an indicator of ecosystem and public health stability",
      "Policy instruments for protecting environmental microbial reservoirs",
      "Multisectoral coordination mechanisms (human, animal, environmental sectors)",
    ],
  },
  {
    num: 4,
    bg: "var(--red)",
    title: "Innovation, Biotechnology and Artificial Intelligence for Sustainable Microbiology",
    desc: "Emerging technologies are reshaping how microbial science is discovered, diagnosed, and deployed. This sub-theme covers AI and big-data applications in microbiology and food/environmental safety, synthetic biology and biotechnology, precision medicine and genomics, and innovations that advance progress toward the Sustainable Development Goals.",
    topics: [
      "AI in microbial sciences and diagnostics",
      "Biotechnology and synthetic biology",
      "Environmental and industrial microbiology",
      "Precision medicine and genomics",
      "Digital health and bioinformatics",
      "Artificial intelligence and big data in food and environmental microbiology",
      "Microbial innovations for achieving the Sustainable Development Goals",
    ],
  },
  {
    num: 5,
    bg: null,
    title: "Building the Next Generation of Microbial Scientists through Mentorship, Research and Scientific Leadership for One Health Sustainability",
    desc: "A sustainable One Health agenda depends on a well-supported pipeline of scientists equipped to lead across disciplines and sectors. This sub-theme addresses scientific writing and publishing, career development, entrepreneurship, and industry–academia partnerships, with emphasis on mentorship structures that nurture early-career microbiologists.",
    topics: [
      "Scientific writing and publishing",
      "Career development",
      "Entrepreneurship and innovation",
      "Industry–academia partnerships",
      "Student and early-career microbiologist development",
    ],
  },
]

const PROGRAMME_DAYS = [
  { header: "pd-h-blue", label: "Day 1", date: "Nov 22", items: [
    { time: "Morning", text: "Pre-Conference Hands-On Workshop (₦4,000)" },
    { time: "Afternoon", text: "Conference Registration & Welcome" },
    { time: "Evening", text: "Opening Ceremony & Keynote Address" },
  ] },
  { header: "pd-h-red", label: "Day 2", date: "Nov 23", items: [
    { time: "Morning", text: "Plenary Sessions — AMR & Infectious Disease" },
    { time: "Afternoon", text: "Scientific Presentations (Oral)" },
    { time: "Evening", text: "Networking Reception" },
  ] },
  { header: "pd-h-gold", label: "Day 3", date: "Nov 24", items: [
    { time: "Morning", text: "Plenary Sessions — AI & Governance" },
    { time: "Afternoon", text: "Poster Presentations & Policy Dialogue" },
    { time: "Evening", text: "Conference Dinner & Awards" },
  ] },
  { header: "pd-h-dark", label: "Day 4", date: "Nov 25", items: [
    { time: "Morning", text: "Next-Gen Scientists Forum & Mentorship" },
    { time: "Afternoon", text: "Closing Plenary & Resolutions" },
    { time: "Evening", text: "Closing Ceremony" },
  ] },
]

const ELIGIBLE_SUBTHEMES = [
  { bg: "var(--red)", color: "#fff", label: "Antimicrobial Resistance" },
  { bg: "var(--gold)", color: "var(--blue-d)", label: "Emerging Infectious Diseases" },
  { bg: "var(--blue)", color: "#fff", label: "Microbial Science & Governance" },
  { bg: "var(--red)", color: "#fff", label: "AI & Biotechnology" },
  { bg: "var(--gold)", color: "var(--blue-d)", label: "Next-Gen Scientists" },
]

const EARLY_FEES = [
  { cat: "ASM Members", amt: "₦25,000" },
  { cat: "Non-Members", amt: "₦30,000" },
  { cat: "Postgraduate Students", amt: "₦15,000" },
  { cat: "Undergraduate Students", amt: "₦5,000", highlight: true },
  { cat: "International Participants", amt: "$50 USD" },
  { cat: "Online Participants — Local", amt: "₦25,000" },
  { cat: "Online Participants — Foreign", amt: "$25 USD" },
  { cat: "Foreign Corporate Bodies", amt: "$150 USD" },
  { cat: "Abstract Submission Fee", amt: "₦3,000", accent: true },
  { cat: "Pre-Conference Hands-On Workshop", amt: "₦4,000" },
]

const LATE_FEES = [
  { cat: "ASM Members", amt: "₦30,000" },
  { cat: "Non-Members", amt: "₦35,000" },
  { cat: "Postgraduate Students", amt: "₦20,000" },
  { cat: "Undergraduate Students", amt: "₦8,000", highlight: true },
  { cat: "International Participants", amt: "$55 USD" },
  { cat: "Online Participants — Local", amt: "₦30,000" },
  { cat: "Online Participants — Foreign", amt: "$30 USD" },
  { cat: "Foreign Corporate Bodies", amt: "$155 USD" },
  { cat: "Pre-Conference Hands-On Workshop", amt: "₦8,000", accent: true },
]

const ACCOMMODATIONS = [
  {
    header: "ac-h-blue", tag: "Budget · Closest to Venue", name: "SMA Fathers House",
    sub: "📍 Opposite Jabi Lake, Abuja (3.5km, 5–10 min drive)",
    rows: [{ type: "Single Room", price: "₦15,000/night" }, { type: "Dormitory (up to 30)", price: "₦5,000/night" }],
    chip: "✅ Closest to venue", chipClass: "chip-blue",
  },
  {
    header: "ac-h-dark", tag: "Retreat & Conference Centre", name: "DRACC",
    sub: "📍 Aco/AMAC Estate, Airport Road, Abuja",
    rows: [
      { type: "Single Room", price: "₦15,750" },
      { type: "Double (sep. beds)", price: "₦21,000" },
      { type: "Standard", price: "₦26,250" },
      { type: "Suite", price: "₦31,500" },
      { type: "Dormitory (12)", price: "₦55,500" },
    ],
    chip: "Separate Male & Female", chipClass: "chip-blue",
  },
  {
    header: "ac-h-red", tag: "Hotel", name: "Best Budget Hotel", sub: "📍 Abuja",
    rows: [
      { type: "Deluxe Room", price: "₦25,000/night" },
      { type: "Executive Room", price: "₦35,000/night" },
      { type: "Suite", price: "₦45,000/night" },
    ],
    chip: "🏨 Hotel Comfort", chipClass: "chip-red",
  },
]

const AES_ROOMS = [
  { type: "Standard King", single: "₦70k", double: "₦80k" },
  { type: "Deluxe Studio", single: "₦80k", double: "₦90k" },
  { type: "Superior Suite", single: "₦120k", double: "₦130k" },
]

const FAQS = [
  { q: "Who can attend the ASM Nigeria Conference?", a: "The conference is open to microbiologists, researchers, clinicians, veterinarians, environmental scientists, public health professionals, students, policymakers, industry experts, and One Health stakeholders from Nigeria and beyond." },
  { q: "Can I attend online?", a: "Yes! The conference is hybrid. Local online participants pay ₦25,000 (early rate) and foreign online participants pay $25 USD. You'll receive a link to the virtual platform after registration is confirmed." },
  { q: "What is the abstract submission fee and what does it cover?", a: <>The abstract processing fee is ₦3,000 (or $5 USD). This is separate from your conference registration fee. Payment should be made to the ASM Nigeria account at First Bank (2047664724) before or alongside your abstract submission via the <Link href="/register">official portal</Link>.</> },
  { q: "What is the difference between Early and Late registration?", a: "Early/Regular registration is available until October 22, 2026, and offers significantly lower rates (e.g., ASM Members ₦25,000 vs ₦30,000 late). Registering early saves you money and helps the organizers plan effectively. We strongly recommend registering before October 22." },
  { q: "What is the Pre-Conference Hands-On Workshop?", a: "The pre-conference workshop on November 22 is an additional paid session (₦4,000 early / ₦8,000 late) offering practical, skills-based training. It is particularly valuable for students and early-career researchers and requires separate registration." },
  { q: "How do I confirm my payment was received?", a: <>After making your bank transfer to First Bank (Acc: 2047664724, ASM Nigeria), email your payment receipt to <a href={`mailto:${SECRETARIAT_EMAIL}`}>{SECRETARIAT_EMAIL}</a>. The secretariat will confirm your registration within 2–3 working days.</> },
  { q: "Can I submit more than one abstract?", a: "Yes, you may submit multiple abstracts. Each abstract requires a separate processing fee of ₦3,000. Each submission must meet all guidelines and address one or two of the five stated sub-themes." },
]

const NAV_LINKS = [
  { href: "#why", label: "Why Attend" },
  { href: "https://asm.org/membership", label: "Become a Member", external: true },
  { href: "#speakers", label: "Speakers" },
  { href: "#themes", label: "Themes" },
  { href: "#planning-committee", label: "Committee" },
  { href: "#abstract", label: "Abstract" },
  { href: "#registration", label: "Register" },
  { href: "#accommodation", label: "Stay" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacts", label: "Contact" },
  { href: "#partners", label: "Partners" },
]

// Proposed subcommittee membership and terms of reference, as supplied by
// the organizing committee. One TOR is intentionally omitted below (Finance
// and Budget) -- the source document repeats the Scientific Programme
// Committee's TOR there verbatim, which reads as a copy/paste error rather
// than this committee's actual mandate; flagged back rather than guessed at.
const SUBCOMMITTEES = [
  {
    name: "Scientific Programme Committee",
    members: [
      { position: "Chairman", name: "Prof. Nura Muhammad Sani", institution: "Federal University Dutse" },
      { position: "Secretary", name: "Dr. Stephen Dare Oloninefa", institution: "Kogi State University, Kabba" },
      { position: "Member", name: "Prof. Maureen Okwu", institution: "Igbinedion University, Benin" },
      { position: "Member", name: "Dr. Onyinyechi N. Akomah-Abadaike", institution: "University of Port Harcourt" },
      { position: "Member", name: "Dr. Gloria Ezeagu", institution: "Nile University Abuja" },
      { position: "Member", name: "Dr. Constance Ezemba", institution: "California" },
      { position: "Member", name: "Dr. Amaka Olivia Obianom", institution: "Nnamdi Azikiwe University, Awka" },
      { position: "Member", name: "Dr. Ndidiamaka Daniella Ugo-Nkwoala", institution: "Clipstone Research Consulting" },
      { position: "Member", name: "Dr. Abumhere Samuel Aziegbemhin", institution: "University of Benin" },
    ],
    tor: [
      "Develop the scientific programme in line with the conference theme and objectives.",
      "Identify and recommend keynote speakers, plenary speakers, panelists, and moderators.",
      "Develop guidelines for abstract submission, review, and acceptance.",
      "Coordinate the review and selection of abstracts, papers, posters, and presentations.",
      "Prepare the conference schedule, including plenary, parallel, and special sessions.",
      "Coordinate awards, recognitions, and scientific competitions where applicable.",
      "Liaise with invited speakers and resource persons regarding presentation requirements.",
      "Ensure the scientific quality and relevance of conference content.",
    ],
  },
  {
    name: "Finance and Budget Committee",
    members: [
      { position: "Chairman", name: "Dr. Sylvia O. Anyadoh-Nwadike", institution: "ASM Nigeria Ambassador/Convener" },
      { position: "Secretary", name: "Dr. Ndidiamaka Daniella Ugo-Nkwoala", institution: "Clipstone Research Consulting" },
      { position: "Member", name: "Prof. Braide Wesley", institution: "FUTO" },
      { position: "Member", name: "Dr. Daniel Makolo", institution: "Baze University Abuja" },
      { position: "Member", name: "Dr. Abumhere Samuel Aziegbemhin", institution: "University of Benin" },
      { position: "Member", name: "Mercy Abosede Olaniyi", institution: "NIHORT" },
    ],
    tor: null,
  },
  {
    name: "Sponsorship and Fundraising Committee",
    members: [
      { position: "Chairman", name: "Dr. Stephen Dare Oloninefa", institution: "Kogi State University" },
      { position: "Co-Chairman", name: "Dr. Abiodun Aransiola", institution: "University of Abuja" },
      { position: "Secretary", name: "Mr. Taiwo Joshua", institution: "Sightsavers Abuja" },
      { position: "Member", name: "Dr. Japhet Aisoni", institution: "NGO Abuja" },
      { position: "Member", name: "Dr. Gloria Ezeagu", institution: "Nile University Abuja" },
      { position: "Member", name: "Mercy Abosede Olaniyi", institution: "NIHORT Ibadan" },
      { position: "Member", name: "Dr. Constance Ezemba", institution: "California" },
      { position: "Member", name: "Dr. Amaka Olivia Obianom", institution: "Nnamdi Azikiwe University, Awka" },
      { position: "Member", name: "Mr. Musa Mujahid", institution: "FUDMA/Chigari Foundation" },
      { position: "Member", name: "Mrs. Martha Ikpeamanze", institution: "Abuja" },
      { position: "Member", name: "Miss Prisca Anyadoh", institution: "BusinessDay Newspaper, Abuja" },
    ],
    tor: [
      "Develop and implement a resource mobilization strategy for the conference.",
      "Identify prospective sponsors, donors, exhibitors, and partners.",
      "Prepare sponsorship packages and promotional materials.",
      "Engage corporate organizations, development partners, government agencies, and professional bodies for support.",
      "Negotiate sponsorship agreements and partnership arrangements.",
      "Maintain records of sponsorship commitments and donations.",
      "Ensure sponsors receive agreed visibility and benefits.",
      "Provide periodic reports on funds raised and sponsorship activities.",
    ],
  },
  {
    name: "Publicity, Media and Communications Committee",
    members: [
      { position: "Chairman", name: "Prof. Maureen Okwu", institution: "Igbinedion University" },
      { position: "Member", name: "Miss Prisca Nwanyibuife Anyadoh", institution: "BusinessDay Newspaper, Abuja" },
      { position: "Secretary", name: "Mr. Halilu Hafiz", institution: "ATBUTH Bauchi" },
      { position: "Member", name: "Dr. Gloria Ezeagu", institution: "Nile University Abuja" },
      { position: "Member", name: "Dr. Japhet Erasmus Aisoni", institution: "Deep K.Tyagi Foundation International (DKT Nigeria), Abuja" },
      { position: "Member", name: "Dr. Onyinyechi N. Akomah-Abadaike", institution: "University of Port Harcourt" },
      { position: "Member", name: "Mr. Musa Mujahid", institution: "FUDMA/Chigari Foundation" },
      { position: "Member", name: "Mr. Ekene Hillary", institution: "FUTO" },
      { position: "Member", name: "Mercy Abosede Olaniyi", institution: "NIHORT" },
    ],
    tor: [
      "Develop and implement a comprehensive publicity and communication strategy.",
      "Create and disseminate conference promotional materials across various platforms.",
      "Manage the conference website and social media platforms.",
      "Coordinate media engagements, press releases, and public announcements.",
      "Promote conference participation among target audiences.",
      "Develop branding materials and ensure consistency in conference messaging.",
      "Coordinate media coverage before, during, and after the conference.",
      "Document conference highlights and prepare post-conference publicity reports.",
    ],
  },
  {
    name: "Registration and Accreditation Committee",
    members: [
      { position: "Chairman", name: "Dr. Ngozika Okey-Ndeche", institution: "Veritas University Abuja" },
      { position: "Secretary", name: "Mrs. Precious Ishaku", institution: "Bingham University" },
      { position: "Member", name: "Mr. Halilu Hafiz", institution: "ATBUTH Bauchi" },
      { position: "Member", name: "Mr. Omada Stephen", institution: "NOUN Abuja" },
      { position: "Member", name: "Volunteers", institution: "Abuja" },
    ],
    tor: [
      "Develop and manage the conference registration process.",
      "Coordinate participant registration, confirmation, and accreditation.",
      "Maintain an accurate database of conference participants.",
      "Manage registration inquiries and participant support services.",
      "Prepare registration materials, badges, certificates, and participant packs.",
      "Coordinate on-site registration and help desk services.",
      "Provide periodic registration statistics and reports.",
      "Ensure a seamless registration experience for all participants.",
    ],
  },
  {
    name: "Protocol and Hospitality Committee",
    members: [
      { position: "Chairman", name: "Mrs. Martha Ikpeamanze", institution: "Abuja" },
      { position: "Secretary", name: "Mrs. Precious Ishaku", institution: "Bingham University" },
      { position: "Member", name: "Dr. Gloria Ezeagu", institution: "Nile University Abuja" },
      { position: "Member", name: "Mr. Halilu Hafiz", institution: "ATBUTH Bauchi" },
      { position: "Member", name: "Mr. Taiwo Joshua", institution: "Sightsavers Abuja" },
      { position: "Member", name: "Dr. Ibangha Ini-Abasi", institution: "Baze University Abuja" },
    ],
    tor: [
      "Coordinate reception and hospitality arrangements for guests and participants.",
      "Develop and implement protocol procedures for dignitaries and special guests.",
      "Manage welcome, reception, and ceremonial activities.",
      "Coordinate refreshments, meals, and hospitality services during the conference.",
      "Ensure the comfort and welfare of conference guests.",
      "Address hospitality-related concerns promptly and professionally.",
    ],
  },
  {
    name: "Logistics, Transportation and Venue Committee",
    members: [
      { position: "Chairman", name: "Dr. Gloria Ezeagu", institution: "Nile University Abuja" },
      { position: "Secretary", name: "Mr. Uchechukwu Mbonu", institution: "Nile University Abuja" },
      { position: "Member", name: "Dr. Abiodun Aransiola", institution: "University of Abuja" },
      { position: "Member", name: "Dr. Japhet Erasmus Aisoni", institution: "Deep K.Tyagi Foundation International (DKT Nigeria), Abuja" },
      { position: "Member", name: "Mr. Omada Stephen", institution: "NOUN Abuja" },
      { position: "Member", name: "Mr. Taiwo Joshua", institution: "Sightsavers Abuja" },
      { position: "Member", name: "Mr. Musa Mujahid", institution: "FUDMA/Chigari Foundation" },
      { position: "Member", name: "Mrs. Chinonso Ikpeamanze", institution: "Utako, Abuja" },
    ],
    tor: [
      "Coordinate venue preparation and physical arrangements for the conference.",
      "Ensure availability of furniture, equipment, signage, and conference materials.",
      "Coordinate transportation arrangements for conference activities.",
      "Arrange accommodation and welfare support for invited guests and speakers.",
      "Coordinate airport transfers and local transportation for designated guests.",
      "Supervise venue setup and breakdown activities.",
      "Liaise with vendors and service providers on logistical matters.",
      "Coordinate security, emergency response, and safety arrangements.",
      "Ensure uninterrupted logistical support throughout the conference.",
    ],
  },
  {
    name: "Technical and ICT Committee",
    members: [
      { position: "Chairman", name: "Dr. Abiodun Aransiola", institution: "University of Abuja" },
      { position: "Secretary", name: "Mr. Taiwo Joshua", institution: "Sightsavers Abuja" },
      { position: "Member", name: "Dr. Abumhere Samuel Aziegbemhin", institution: "University of Benin" },
      { position: "Member", name: "Dr. Ibangha Ini-Abasi", institution: "Baze University Abuja" },
      { position: "Member", name: "Mr. Ekene Hillary", institution: "FUTO" },
      { position: "Member", name: "Mr. Uchechukwu Mbonu", institution: "Nile University Abuja" },
    ],
    tor: [
      "Provide technical support for all conference sessions and activities.",
      "Manage audiovisual equipment, projection systems, and sound systems.",
      "Coordinate virtual participation platforms where applicable.",
      "Ensure stable internet connectivity and ICT infrastructure.",
      "Support online abstract submission and registration systems.",
      "Troubleshoot technical issues before and during conference sessions.",
      "Coordinate recording, streaming, and archiving of conference proceedings where applicable.",
      "Ensure data security and proper management of digital conference resources.",
    ],
  },
  {
    name: "Volunteer Coordination Committee",
    members: [
      { position: "Chairman", name: "Dr. Ibangha Ini-Abasi", institution: "Baze University Abuja" },
      { position: "Secretary", name: "Mr. Omada Stephen", institution: "NOUN Abuja" },
      { position: "Member", name: "Mr. Taiwo Joshua", institution: "Sightsavers Abuja" },
      { position: "Member", name: "Mr. Uchechukwu Mbonu", institution: "Nile University Abuja" },
      { position: "Member", name: "Miss Prisca Nwanyibuife Anyadoh", institution: "BusinessDay Newspaper, Abuja" },
      { position: "Member", name: "Mrs. Precious Ishaku", institution: "Bingham University, Karu" },
    ],
    tor: [
      "Recruit and screen conference volunteers.",
      "Assign volunteers to appropriate conference duties and locations.",
      "Organize orientation and training programmes for volunteers.",
      "Develop volunteer schedules and duty rosters.",
      "Supervise volunteer activities before, during, and after the conference.",
      "Ensure effective communication between volunteers and committee leadership.",
      "Address volunteer welfare, motivation, and performance issues.",
      "Prepare reports on volunteer engagement and contributions to the conference.",
    ],
  },
  {
    name: "Exhibition, Partnerships and Industry Engagement Committee",
    members: [
      { position: "Chairman", name: "Miss Prisca Anyadoh", institution: "BusinessDay Newspaper, Abuja" },
      { position: "Member", name: "Dr. Japhet Erasmus Aisoni", institution: "Deep K.Tyagi Foundation International (DKT Nigeria), Abuja" },
      { position: "Secretary", name: "Mr. Ekene Hillary", institution: "FUTO" },
      { position: "Member", name: "Prof. Nura Muhammad Sani", institution: "Federal University Dutse" },
      { position: "Member", name: "Prof. Maureen Okwu", institution: "Igbinedion University" },
      { position: "Member", name: "Dr. Abiodun Aransiola", institution: "University of Abuja" },
      { position: "Member", name: "Dr. Stephen Dare Oloninefa", institution: "Kogi State University" },
      { position: "Member", name: "Dr. Amaka Olivia Obianom", institution: "Nnamdi Azikiwe University" },
      { position: "Member", name: "Dr. Constance Ezemba", institution: "California" },
      { position: "Member", name: "Dr. Onyinyechi N. Akomah-Abadaike", institution: "University of Port Harcourt" },
      { position: "Member", name: "Mrs. Precious Ishaku", institution: "Bingham University, Karu" },
      { position: "Member", name: "Mercy Abosede Olaniyi", institution: "NIHORT" },
    ],
    tor: [
      "Identify and recruit exhibitors from academia, industry, government, and development organizations.",
      "Develop exhibition packages and guidelines.",
      "Coordinate exhibition space allocation and setup.",
      "Facilitate engagement between exhibitors and conference participants.",
      "Promote industry-academia partnerships through the exhibition platform.",
      "Coordinate exhibition logistics and support services.",
      "Ensure compliance with exhibition policies and standards.",
      "Prepare reports on exhibition participation and outcomes.",
    ],
  },
]

const COMMITTEE = [
  { initials: "BW", name: "Prof. Braide Wesley", role: "Chairman, Main Organizing Committee", tel: "+2348037100964", phone: "08037100964" },
  { initials: "DM", name: "Daniel Makolo, Ph.D.", role: "Chairman, Local Organizing Committee", tel: "+2347063576680", phone: "07063576680" },
  { initials: "MO", name: "Prof. Maureen Okwu", role: "Chairman, Publicity, Media & Communications", tel: "+2348024280225", phone: "08024280225" },
]

const SECRETARIAT = [
  { initials: "AA", name: "Dr. Abumhere S. Aziegbemhin, Ph.D.", role: "Secretary, Main Organising Committee", tel: "+2348067544546", phone: "08067544546" },
  { initials: "OS", name: "Omada Stephen", role: "Secretary, Local Organising Committee", tel: "+2348060777570", phone: "0806 077 7570" },
]

type ContactFormState = { name: string; email: string; subject: string; message: string; company: string }
const EMPTY_CONTACT_FORM: ContactFormState = { name: "", email: "", subject: "General Enquiry", message: "", company: "" }

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [regTab, setRegTab] = useState<"early" | "late">("early")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [openCommittee, setOpenCommittee] = useState<number | null>(null)
  const [openTheme, setOpenTheme] = useState<number | null>(null)
  const [openSpeaker, setOpenSpeaker] = useState<number | null>(null)
  const [confCountdown, setConfCountdown] = useState(PENDING_COUNTDOWN)
  const [earlyCountdown, setEarlyCountdown] = useState(PENDING_COUNTDOWN)
  const [earlyExpired, setEarlyExpired] = useState(false)
  const [earlyDaysLeft, setEarlyDaysLeft] = useState<number | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const partnersScrollRef = useRef<HTMLDivElement | null>(null)

  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM)
  const [contactStatus, setContactStatus] = useState<"idle" | "pending" | "error">("idle")
  const [contactError, setContactError] = useState<string | null>(null)

  // Keep anchor-link scrolling smooth only while this page is mounted.
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth"
    return () => {
      document.documentElement.style.scrollBehavior = ""
    }
  }, [])

  // Dismissal is per-deadline (keyed to the date in the banner copy) so a
  // visitor who closes it doesn't have it reappear on their next visit, but
  // it does come back if the deadline text is ever updated.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.localStorage.getItem(BANNER_DISMISS_KEY) !== "1") return
    // Deferred to a callback rather than an unconditional setState in the
    // effect body -- see the identical pattern (and reasoning) in Reveal.
    const frame = requestAnimationFrame(() => setBannerDismissed(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  function dismissBanner() {
    setBannerDismissed(true)
    try {
      window.localStorage.setItem(BANNER_DISMISS_KEY, "1")
    } catch {
      // localStorage unavailable (private browsing etc.) -- dismissal just won't persist
    }
  }

  useEffect(() => {
    function tick() {
      const now = Date.now()
      setConfCountdown(splitCountdown(CONFERENCE_DATE - now))
      const remaining = EARLY_DEADLINE - now
      setEarlyCountdown(splitCountdown(remaining))
      setEarlyExpired(remaining <= 0)
      setEarlyDaysLeft(Math.max(0, Math.ceil(remaining / 86400000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false)
        setContactOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function handleCopy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`✅ ${msg}`)
    } catch {
      showToast(`❌ Copy failed — please copy manually: ${text}`)
    }
  }

  function toggleFaq(i: number) {
    setOpenFaq((current) => (current === i ? null : i))
  }

  function toggleCommittee(i: number) {
    setOpenCommittee((current) => (current === i ? null : i))
  }

  function toggleTheme(i: number) {
    setOpenTheme((current) => (current === i ? null : i))
  }

  function toggleSpeaker(i: number) {
    setOpenSpeaker((current) => (current === i ? null : i))
  }

  function scrollPartners(direction: -1 | 1) {
    const el = partnersScrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * (el.clientWidth * 0.8), behavior: "smooth" })
  }

  function openContactModal() {
    setContactStatus("idle")
    setContactError(null)
    setContactOpen(true)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactStatus("pending")
    setContactError(null)
    const result = await submitContactMessageAction(contactForm)
    if ("error" in result) {
      setContactStatus("error")
      setContactError(result.error)
      return
    }
    setContactStatus("idle")
    setContactOpen(false)
    setContactForm(EMPTY_CONTACT_FORM)
    showToast("✅ Message sent! We will respond within 2 working days.")
  }

  return (
    <div className="asm-landing">
      {/* ═══ URGENCY BANNER ═══ */}
      {!earlyExpired && !bannerDismissed && (
        <div id="urgency-bar" role="alert" aria-label="Urgent deadline notice">
          <div className="inner">
            <span className="label">
              🚨 <strong>Early Abstract Submission closes August 30, 2026</strong> — only
            </span>
            <div className="countdown-inline" aria-live="polite">
              <span className="ci-box">{earlyCountdown.d}</span>
              <span className="ci-sep">d</span>
              <span className="ci-box">{earlyCountdown.h}</span>
              <span className="ci-sep">h</span>
              <span className="ci-box">{earlyCountdown.m}</span>
              <span className="ci-sep">m</span>
              <span className="ci-box">{earlyCountdown.s}</span>
              <span className="ci-sep">s</span>
            </div>
            <span className="label">left</span>
            <Link href="/register" className="bar-cta">
              Submit Now →
            </Link>
            <button type="button" className="bar-close" onClick={dismissBanner} aria-label="Dismiss this notice">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ═══ NAV ═══ */}
      <header>
        <nav id="nav" role="navigation" aria-label="Main navigation">
          <div className="nav-wrap">
            <a href="#hero" className="nav-brand" aria-label="ASM Nigeria Conference 2026 home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/asm-logo.png" alt="ASM — Microbes Make Our World" className="nav-logo-img" width={120} height={40} />
            </a>
            <div className="nav-links" role="list">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  role="listitem"
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.label}
                </a>
              ))}
              <a href="#registration" className="nav-cta" role="listitem">
                Register Now
              </a>
            </div>
            <button
              className="hamburger"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span /> <span /> <span />
            </button>
          </div>
          <nav id="mobile-nav" className={mobileOpen ? "nav-mobile open" : "nav-mobile"} aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </nav>
      </header>

      <main>
        {/* ═══ HERO ═══ */}
        <section id="hero" aria-label="Conference overview">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-grid-lines" aria-hidden="true" />
          <div className="hero-content">
            <div className="hero-left">
              <div className="hero-chip">
                <span className="chip chip-white">
                  <span className="dot" />
                  🇳🇬 Maiden ASM Nigeria Conference · Abuja 2026
                </span>
              </div>
              <h1 className="display hero-title">
                ASM <em>NIGERIA</em>
                <br />
                <span>CONFERENCE</span>
              </h1>
              <p className="hero-tagline">One Health · One Future · One Scientific Community</p>
              <div className="one-health-badge">
                <span className="ohb-ring" aria-hidden="true">🌍</span>
                <span className="ohb-text"><strong>ONE HEALTH</strong><br />Human · Animal · Environment</span>
              </div>
              <div className="hero-theme">
                <strong>Theme:</strong> One Health in Action — Advancing Microbial Science for Global Health,
                Animal &amp; Environmental Health
              </div>
              <div className="hero-meta" role="list">
                <div className="hero-meta-row" role="listitem">
                  <div className="hero-meta-icon" aria-hidden="true">📅</div>
                  <span><strong>22nd – 25th November, 2026</strong></span>
                </div>
                <div className="hero-meta-row" role="listitem">
                  <div className="hero-meta-icon" aria-hidden="true">📍</div>
                  <span>Conference Centre, <strong>National Open University of Nigeria</strong>, Abuja</span>
                </div>
                <div className="hero-meta-row" role="listitem">
                  <div className="hero-meta-icon" aria-hidden="true">🌐</div>
                  <span><strong>Hybrid</strong> — In-person + Online</span>
                </div>
              </div>
              <div className="hero-actions">
                <a href="#registration" className="btn btn-primary btn-lg">🎟️ Register Now</a>
                <Link href="/register" className="btn btn-secondary btn-lg">📄 Submit Abstract</Link>
              </div>
              <a href="#why" className="hero-learn-more">Learn more about the conference ↓</a>
              <div className="hero-powered-by">Powered by the ASM Country Ambassador to Nigeria Project Fund</div>
            </div>

            <div>
              <div className="hero-card" role="complementary" aria-label="Conference countdown">
                <div className="hero-card-header">
                  <span className="hch-icon" aria-hidden="true">⏱️</span>
                  <div>
                    <div className="hch-title">Conference Countdown</div>
                    <div className="hch-sub">22 November 2026 · Abuja, Nigeria</div>
                  </div>
                </div>
                <div className="hero-card-body">
                  <div className="countdown-grid" aria-live="polite" aria-label="Time until conference">
                    <div className="cd-box"><div className="cd-num">{confCountdown.d}</div><div className="cd-label">Days</div></div>
                    <div className="cd-box"><div className="cd-num">{confCountdown.h}</div><div className="cd-label">Hrs</div></div>
                    <div className="cd-box"><div className="cd-num">{confCountdown.m}</div><div className="cd-label">Mins</div></div>
                    <div className="cd-box"><div className="cd-num">{confCountdown.s}</div><div className="cd-label">Secs</div></div>
                  </div>
                  <div className="hero-card-divider" />
                  <div className="hero-card-stat"><span className="hcs-label">📅 Abstract Early Deadline</span><span className="hcs-val">Aug 30, 2026</span></div>
                  <div className="hero-card-stat"><span className="hcs-label">📅 Final Abstract Deadline</span><span className="hcs-val">Nov 2, 2026</span></div>
                  <div className="hero-card-stat"><span className="hcs-label">💳 Early Registration Cutoff</span><span className="hcs-val">Oct 22, 2026</span></div>
                  <div className="hero-card-stat"><span className="hcs-label">🎤 Presentation Mode</span><span className="hcs-val">Oral / Poster</span></div>
                  <div className="hero-card-stat"><span className="hcs-label">🌐 Format</span><span className="hcs-val">Hybrid</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS BAR ═══ */}
        <div id="stats" role="region" aria-label="Key conference figures">
          <div className="stats-wrap">
            <Reveal delay={0} className="stat-item">
              <div className="stat-num">1<span className="unit">st</span></div>
              <div className="stat-desc">ASM Conference in Nigeria</div>
            </Reveal>
            <Reveal delay={80} className="stat-item">
              <div className="stat-num">4</div>
              <div className="stat-desc">Days of Science &amp; Dialogue</div>
            </Reveal>
            <Reveal delay={160} className="stat-item">
              <div className="stat-num">500<span className="unit">+</span></div>
              <div className="stat-desc">Scientists, Clinicians &amp; Students</div>
            </Reveal>
          </div>
        </div>

        {/* ═══ WHY ATTEND ═══ */}
        <section id="why" className="section" aria-labelledby="why-heading">
          <div className="wrap">
            <div className="about-row">
              <Reveal className="about-conference">
                <span className="caption eyebrow" style={{ color: "var(--red)" }}>About the Conference</span>
                <h2 className="headline">A National Platform for Scientific Exchange</h2>
                <div className="rule" />
                <p className="body-lg">
                  The ASM One Health Scientific Conference is the maiden ASM scientific conference in
                  Nigeria, serving as a national platform for scientific exchange. It is a landmark
                  scientific gathering bringing together microbiologists, researchers, clinicians,
                  veterinarians, environmental scientists, public health professionals, students,
                  policymakers, industry professionals, and One Health stakeholders from Nigeria and
                  beyond. The conference will provide a dynamic platform for sharing cutting-edge
                  research, advancing scientific collaboration, strengthening capacity, and translating
                  microbial science into solutions for human, animal, and environmental health.
                </p>
                <p className="body-lg">
                  Through keynote address, plenary cum scientific sessions, practical workshops,
                  innovation showcases, mentorship, networking, and policy dialogue, the conference will
                  spotlight the transformative role of microbiology in addressing antimicrobial
                  resistance, emerging infectious diseases, biotechnology, artificial intelligence, food
                  security, climate change, and sustainable/resilient health systems.
                </p>
                <p className="body-lg">
                  Under the theme &ldquo;One Health in Action: Advancing Microbial Science for Human,
                  Animal, Environmental, and Global Health,&rdquo; the conference seeks to inspire
                  collaboration, nurture the next generation of microbial scientists, and strengthen the
                  contribution of microbiology to Nigeria&apos;s health, research, innovation, and
                  sustainable development agenda.
                </p>
              </Reveal>

              <Reveal delay={40} className="convener-side">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/speakers/sylvia-anyadoh-nwadike.jpg"
                  alt="Sylvia O. Anyadoh-Nwadike, PhD"
                  className="convener-photo-full"
                />
                <div className="convener-side-details">
                  <span className="caption eyebrow" style={{ color: "var(--gold-d)" }}>Conference Convener</span>
                  <h3 className="convener-name">Sylvia O. Anyadoh-Nwadike, PhD</h3>
                  <p className="convener-title">ASM Country Ambassador to Nigeria</p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={80}>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Why Attend</span>
              <h2 className="headline" id="why-heading">Africa&apos;s Most Impactful<br />Microbiology Event of 2026</h2>
              <div className="rule" />
              <p className="body-lg">Whether you are a researcher, clinician, student, or policymaker — this is where Nigerian and African science meets global standards.</p>
            </Reveal>
            <div className="why-grid">
              {WHY_CARDS.map((card, i) => (
                <Reveal key={card.title} delay={(i % 3) * 80} className="why-card">
                  <div className={`why-icon ${card.accent}`}>{card.icon}</div>
                  <h3 className="why-title">{card.title}</h3>
                  <p className="why-desc">{card.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SPEAKERS ═══ */}
        <section id="speakers" className="section" aria-labelledby="speakers-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Distinguished Speakers</span>
              <h2 className="headline" id="speakers-heading">Voices Shaping<br />One Health Science</h2>
              <div className="rule" />
            </Reveal>
            <div className="speakers-row">
              {SPEAKERS.map((sp, i) => (
                <Reveal
                  key={sp.name}
                  delay={i * 80}
                  className={openSpeaker === i ? "speaker-card open" : "speaker-card"}
                  style={{ "--accent": sp.accent } as React.CSSProperties}
                >
                  <div
                    className="sp-header"
                    onClick={() => toggleSpeaker(i)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={openSpeaker === i}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSpeaker(i) } }}
                  >
                    {sp.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sp.image} alt={sp.name} className="sp-avatar sp-avatar-img" />
                    ) : (
                      <div className="sp-avatar" style={sp.initials === "SA" ? { background: "var(--gold-d)" } : undefined}>{sp.initials}</div>
                    )}
                    <div className="sp-info">
                      <div className="sp-chip"><span className={`chip ${sp.chip}`}>{sp.chipLabel}</span></div>
                      <div className="sp-name">{sp.name}</div>
                      <div className="sp-title">{sp.title}{sp.sub && <><br />{sp.sub}</>}</div>
                    </div>
                    <span className="faq-arrow sp-arrow" aria-hidden="true">⌄</span>
                  </div>
                  <div className="sp-body">
                    <p className="sp-bio">{sp.bio || "Full biography coming soon."}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ THEMES ═══ */}
        <section id="themes" className="section" aria-labelledby="themes-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow">Sub-Themes</span>
              <h2 className="headline" id="themes-heading">Five Pillars of One Health</h2>
              <div className="rule" />
              <p className="body-lg">All abstracts must address one or two of these sub-themes.</p>
            </Reveal>
            <div className="themes-grid themes-grid-full">
              {THEMES.map((t, i) => (
                <Reveal key={t.num} delay={i * 80} className={openTheme === i ? "theme-card theme-card-full open" : "theme-card theme-card-full"}>
                  <div
                    className="tc-header"
                    onClick={() => toggleTheme(i)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={openTheme === i}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTheme(i) } }}
                  >
                    <div className="tc-num" style={t.bg ? { background: t.bg, color: t.num === 3 ? "#fff" : undefined } : undefined}>{t.num}</div>
                    <div className="tc-title">{t.title}</div>
                    <span className="faq-arrow tc-arrow" aria-hidden="true">⌄</span>
                  </div>
                  <div className="tc-body">
                    <p className="tc-desc">{t.desc}</p>
                    <div className="tc-topics">
                      {t.topics.map((topic) => (
                        <span className="tc-topic" key={topic}>{topic}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PLANNING COMMITTEE ═══ */}
        <section id="planning-committee" className="section" aria-labelledby="committee-heading">
          <div className="wrap">
            <Reveal className="reveal-center" style={{ textAlign: "center" } as React.CSSProperties}>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Planning Committee</span>
              <h2 className="headline" id="committee-heading">Maiden ASM Nigeria Conference<br />Abuja 2026 — Subcommittees</h2>
              <div className="rule rule-center" />
              <p className="body-lg">Ten subcommittees, drawn from institutions and organizations across Nigeria, plan and run every part of the conference.</p>
            </Reveal>
            <div className="committee-list" role="list">
              {SUBCOMMITTEES.map((c, i) => (
                <div className={openCommittee === i ? "committee-item open" : "committee-item"} role="listitem" key={c.name}>
                  <div
                    className="committee-q"
                    onClick={() => toggleCommittee(i)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={openCommittee === i}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCommittee(i) } }}
                  >
                    <span>{i + 1}. {c.name}</span>
                    <span className="faq-arrow" aria-hidden="true">⌄</span>
                  </div>
                  <div className="committee-a">
                    <div className="committee-members">
                      {c.members.map((m) => (
                        <div className="committee-member" key={`${c.name}-${m.name}`}>
                          <span className="cm-position">{m.position}</span>
                          <span className="cm-name">{m.name}</span>
                          <span className="cm-institution">{m.institution}</span>
                        </div>
                      ))}
                    </div>
                    {c.tor ? (
                      <div className="committee-tor">
                        <div className="committee-tor-title">Terms of Reference</div>
                        <ol>
                          {c.tor.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <div className="committee-tor">
                        <p className="committee-tor-pending">Terms of reference to be finalized.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PROGRAMME ═══ */}
        <section id="programme" className="section" aria-labelledby="prog-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Programme Outline</span>
              <h2 className="headline" id="prog-heading">4 Days of Science,<br />Dialogue &amp; Discovery</h2>
              <div className="rule" />
              <p className="body-lg">A full programme will be published closer to the conference date. Below is the planned structure.</p>
            </Reveal>
            <div className="prog-days">
              {PROGRAMME_DAYS.map((day, i) => (
                <Reveal key={day.label} delay={i * 80} className="prog-day">
                  <div className={`pd-header ${day.header}`}>
                    <div className="day-label">{day.label}</div>
                    <div className="day-date">{day.date}</div>
                  </div>
                  <div className="pd-body">
                    {day.items.map((item) => (
                      <div className="pd-item" key={item.time}>
                        <strong>{item.time}</strong>{item.text}
                      </div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="pd-note">
              Full programme details will be announced. Follow{" "}
              <Link href="/" style={{ color: "var(--blue)", fontWeight: 600 }}>asmnigeriaconference.com.ng</Link> for updates.
            </p>
          </div>
        </section>

        {/* ═══ ABSTRACT ═══ */}
        <section id="abstract" className="section" aria-labelledby="abstract-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Abstract Submission</span>
              <h2 className="headline" id="abstract-heading">Share Your Research</h2>
              <div className="rule" />
              <p className="body-lg">Submit your abstract for oral or poster presentation. Early submissions close <strong style={{ color: "var(--red)" }}>August 30, 2026</strong>.</p>
            </Reveal>
            <div className="abstract-grid">
              <Reveal delay={80}>
                <h3 className="subhead" style={{ color: "var(--ink)", marginBottom: 20 }}>Key Deadlines</h3>
                <div className="deadline-stack">
                  <div className="dl-card" style={{ "--accent": "var(--red)" } as React.CSSProperties}>
                    <div className="dl-icon">🚨</div>
                    <div><div className="dl-label">Early Submission Closes</div><div className="dl-date">August 30, 2026</div></div>
                    {!earlyExpired && earlyDaysLeft !== null && (
                      <span className="dl-badge db-red">{earlyDaysLeft} Day{earlyDaysLeft === 1 ? "" : "s"} Left!</span>
                    )}
                  </div>
                  <div className="dl-card" style={{ "--accent": "var(--gold)" } as React.CSSProperties}>
                    <div className="dl-icon">📅</div>
                    <div><div className="dl-label">Final Submission Closes</div><div className="dl-date">November 2, 2026</div></div>
                    <span className="dl-badge db-gold">Final Deadline</span>
                  </div>
                  <div className="dl-card" style={{ "--accent": "var(--blue)" } as React.CSSProperties}>
                    <div className="dl-icon">🎤</div>
                    <div><div className="dl-label">Presentation Mode</div><div className="dl-date">Oral / Poster</div></div>
                  </div>
                </div>
                <div className="portal-box">
                  <h3>Ready to Submit?</h3>
                  <p>Processing Fee: <strong>₦3,000</strong> or <strong>$5 USD</strong>. Submit via the official ASM portal.</p>
                  <Link href="/register">🔗 Open Submission Portal <span aria-hidden="true">→</span></Link>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div className="guidelines-box">
                  <h3>Abstract Guidelines</h3>
                  <div className="gl-item"><div className="gl-dot" /><span>Must address <strong>one or two</strong> stated sub-themes</span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Maximum <strong>250 words</strong>, single spacing</span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Font: <strong>Times New Roman, Size 12</strong></span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Include <strong>all authors&apos; names and affiliations</strong></span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Corresponding author&apos;s <strong>email address required</strong></span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Processing fee: <strong>₦3,000</strong> or <strong>$5 USD</strong></span></div>
                  <div className="gl-item"><div className="gl-dot" /><span>Submit only via the <strong>official abstract portal</strong></span></div>
                </div>
                <div style={{ background: "#fff", borderRadius: "var(--r-lg)", padding: 24, marginTop: 16, border: "1px solid var(--line)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>Eligible Sub-Themes</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ELIGIBLE_SUBTHEMES.map((s, i) => (
                      <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--ink)" }}>
                        <span style={{ width: 22, height: 22, background: s.bg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: s.color, fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ REGISTRATION ═══ */}
        <section id="registration" className="section" aria-labelledby="reg-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Registration &amp; Fees</span>
              <h2 className="headline" id="reg-heading">Secure Your Place</h2>
              <div className="rule" />
              <p className="body-lg">Early registration closes <strong>October 22, 2026</strong>. Register early and save.</p>
            </Reveal>
            <div style={{ marginTop: 40 }}>
              <div className="reg-switcher" role="tablist" aria-label="Registration period">
                <button className={regTab === "early" ? "rsw-btn active" : "rsw-btn"} role="tab" aria-selected={regTab === "early"} aria-controls="tab-early" onClick={() => setRegTab("early")}>
                  Early/Regular (Till Oct 22)
                </button>
                <button className={regTab === "late" ? "rsw-btn active" : "rsw-btn"} role="tab" aria-selected={regTab === "late"} aria-controls="tab-late" onClick={() => setRegTab("late")}>
                  Late Registration (After Oct 22)
                </button>
              </div>
              <Reveal>
                <div className="reg-table-wrap">
                  <table className="fee-table" id="tab-early" role="tabpanel" aria-label="Early registration fees" style={{ display: regTab === "early" ? undefined : "none" }}>
                    <thead><tr><th scope="col">Participant Category</th><th scope="col" style={{ textAlign: "right" }}>Fee</th></tr></thead>
                    <tbody>
                      {EARLY_FEES.map((f) => (
                        <tr key={f.cat} className={f.highlight ? "highlight" : undefined} style={f.accent ? { background: "var(--red-bg)" } : undefined}>
                          <td className="cat" style={f.accent ? { color: "var(--red)", fontWeight: 700 } : undefined}>{f.cat}</td>
                          <td className="amt" style={f.accent ? { color: "var(--red)" } : undefined}>{f.amt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <table className="fee-table" id="tab-late" role="tabpanel" aria-label="Late registration fees" style={{ display: regTab === "late" ? undefined : "none" }}>
                    <thead><tr><th scope="col">Participant Category</th><th scope="col" style={{ textAlign: "right" }}>Fee</th></tr></thead>
                    <tbody>
                      {LATE_FEES.map((f) => (
                        <tr key={f.cat} className={f.highlight ? "highlight" : undefined} style={f.accent ? { background: "var(--red-bg)" } : undefined}>
                          <td className="cat" style={f.accent ? { color: "var(--red)", fontWeight: 700 } : undefined}>{f.cat}</td>
                          <td className="amt" style={f.accent ? { color: "var(--red)" } : undefined}>{f.amt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
              <Reveal>
                <div className="reg-alert" role="note">
                  <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
                  <div><strong>Save money:</strong> Register before October 22, 2026 for Early/Regular rates. Undergraduate students get the best rate — only ₦5,000 early.</div>
                </div>
              </Reveal>
              <Reveal>
                <div className="reg-cta">
                  <Link href="/register-conference" className="btn btn-primary btn-lg">
                    🎟️ Register for the Conference →
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ PAYMENT ═══ */}
        <section id="payment" className="section-sm" aria-labelledby="pay-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Payment Details</span>
              <h2 className="headline" id="pay-heading">How to Pay</h2>
              <div className="rule" />
            </Reveal>
            <div className="pay-grid">
              <Reveal delay={80} className="pay-card">
                <span className="pay-label">Bank Transfer Details</span>
                <div className="pay-field">
                  <div className="pay-field-name">Bank</div>
                  <div className="pay-field-val">First Bank Nigeria</div>
                </div>
                <div className="pay-field">
                  <div className="pay-field-name">Account Name</div>
                  <div className="pay-field-val" style={{ fontSize: 15, lineHeight: 1.5 }}>American Society for Microbiology<br />(ASM) Nigeria</div>
                </div>
                <div className="pay-field">
                  <div className="pay-field-name">Account Number</div>
                  <div className="pay-acc">2047664724</div>
                  <button className="copy-btn" onClick={() => handleCopy("2047664724", "Account number copied!")} aria-label="Copy account number to clipboard">📋 Copy Number</button>
                </div>
              </Reveal>
              <Reveal delay={160} className="steps-col">
                <h3 className="subhead" style={{ color: "var(--ink)", marginBottom: 4 }}>4-Step Payment Process</h3>
                <p className="body" style={{ marginBottom: 20 }}>Simple, straightforward, and secure.</p>
                <div className="step-card"><div className="step-n">1</div><div><div className="step-h">Select your category</div><div className="step-p">Identify your participant category and the applicable fee from the registration table above.</div></div></div>
                <div className="step-card"><div className="step-n">2</div><div><div className="step-h">Transfer to ASM Nigeria</div><div className="step-p">Send payment to First Bank — Acc No: <strong>2047664724</strong>, ASM Nigeria.</div></div></div>
                <div className="step-card"><div className="step-n">3</div><div><div className="step-h">Save your receipt</div><div className="step-p">Keep a copy of your bank receipt/teller for verification at the conference gate.</div></div></div>
                <div className="step-card"><div className="step-n">4</div><div><div className="step-h">Email the secretariat</div><div className="step-p">Send receipt to <a href={`mailto:${SECRETARIAT_EMAIL}`}>{SECRETARIAT_EMAIL}</a> to confirm your registration.</div></div></div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ TRAVEL GRANT ═══ */}
        <section id="travel-grant" className="section-sm" aria-labelledby="travel-grant-heading">
          <div className="wrap">
            <Reveal className="travel-grant-card">
              <div className="tg-icon" aria-hidden="true">✈️</div>
              <div className="tg-body">
                <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Travel Support</span>
                <h3 className="tg-title" id="travel-grant-heading">Professor KIT Eniola Travel Grant</h3>
                <p className="tg-desc">
                  For Early Career Microbiologists. Travel support available for eligible early
                  career participants. Selection criteria apply.
                </p>
              </div>
              <a href={`mailto:${SECRETARIAT_EMAIL}?subject=Professor%20KIT%20Eniola%20Travel%20Grant%20Enquiry`} className="btn btn-secondary">
                ✉️ Enquire About the Grant
              </a>
            </Reveal>
          </div>
        </section>

        {/* ═══ ACCOMMODATION ═══ */}
        <section id="accommodation" className="section" aria-labelledby="accomm-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Where to Stay</span>
              <h2 className="headline" id="accomm-heading">Accommodation Options<br />in Abuja</h2>
              <div className="rule" />
              <p className="body-lg">From budget dormitory to luxury apartments — options to suit every traveller.</p>
            </Reveal>
            <div className="accomm-grid">
              {ACCOMMODATIONS.map((a, i) => (
                <Reveal key={a.name} delay={i * 80} className="accomm-card">
                  <div className={`ac-header ${a.header}`}>
                    <div className="ac-tag">{a.tag}</div>
                    <div className="ac-name">{a.name}</div>
                    <div className="ac-sub">{a.sub}</div>
                  </div>
                  <div className="ac-body">
                    {a.rows.map((r) => (
                      <div className="ac-row" key={r.type}><span className="ac-type">{r.type}</span><span className="ac-price">{r.price}</span></div>
                    ))}
                    <div className="ac-chip"><span className={`chip ${a.chipClass}`}>{a.chip}</span></div>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={3 * 80} className="accomm-card">
                <div className="ac-header ac-h-gold">
                  <div className="ac-tag">Luxury Apartments</div>
                  <div className="ac-name">AES Luxury Apartments</div>
                  <div className="ac-sub">📍 Abuja</div>
                </div>
                <div className="ac-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 0 6px", borderBottom: "2px solid var(--line)", gap: 4 }}>
                    <span>Room Type</span><span style={{ padding: "0 8px" }}>Single</span><span>Double</span>
                  </div>
                  {AES_ROOMS.map((r) => (
                    <div className="ac-row" key={r.type} style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}>
                      <span className="ac-type">{r.type}</span>
                      <span className="ac-price" style={{ padding: "0 8px" }}>{r.single}</span>
                      <span className="ac-price">{r.double}</span>
                    </div>
                  ))}
                  <div className="ac-chip"><span className="chip" style={{ background: "var(--gold-bg)", color: "var(--gold-d)" }}>⭐ Luxury Option</span></div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ VENUE ═══ */}
        <section id="venue" className="section" aria-labelledby="venue-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow">Conference Venue</span>
              <h2 className="headline" id="venue-heading">National Open University<br />of Nigeria, Abuja</h2>
              <div className="rule" />
            </Reveal>
            <div className="venue-grid">
              <Reveal delay={80} className="venue-facts">
                <div className="vf-card"><div className="vf-label">📍 Address</div><div className="vf-val">Conference Centre, Besides the Library,<br />Opposite the Convocation Square,<br /><strong style={{ color: "var(--gold)" }}>National Open University of Nigeria (NOUN)</strong><br />Abuja Headquarters, FCT</div></div>
                <div className="vf-card"><div className="vf-label">📅 Dates</div><div className="vf-val"><strong style={{ color: "#fff" }}>22nd – 25th November 2026</strong><br /><span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>4 full days of science and dialogue</span></div></div>
                <div className="vf-card"><div className="vf-label">🌐 Format</div><div className="vf-val"><strong style={{ color: "var(--gold)" }}>HYBRID</strong> — Attend in Abuja or join virtually from anywhere in the world</div></div>
              </Reveal>
              <Reveal delay={160} className="map-placeholder">
                <div className="mp-icon" aria-hidden="true">🗺️</div>
                <div className="mp-name">National Open University of Nigeria, Abuja Headquarters</div>
                <div className="mp-addr">Conference Centre · FCT, Nigeria</div>
                <a href="https://maps.google.com/?q=National+Open+University+of+Nigeria+Abuja" target="_blank" rel="noopener noreferrer" aria-label="View NOUN Abuja on Google Maps">📍 Open in Google Maps →</a>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="section" aria-labelledby="faq-heading">
          <div className="wrap">
            <Reveal className="reveal-center" style={{ textAlign: "center" } as React.CSSProperties}>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Frequently Asked Questions</span>
              <h2 className="headline" id="faq-heading">Got Questions?</h2>
              <div className="rule rule-center" />
              <p className="body-lg">Everything you need to know before you register or submit.</p>
            </Reveal>
            <div className="faq-list" role="list">
              {FAQS.map((item, i) => (
                <div className={openFaq === i ? "faq-item open" : "faq-item"} role="listitem" key={item.q}>
                  <div
                    className="faq-q"
                    onClick={() => toggleFaq(i)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={openFaq === i}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFaq(i) } }}
                  >
                    {item.q}<span className="faq-arrow" aria-hidden="true">⌄</span>
                  </div>
                  <div className="faq-a">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CONTACTS ═══ */}
        <section id="contacts" className="section" aria-labelledby="contacts-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--red)" }}>Get in Touch</span>
              <h2 className="headline" id="contacts-heading">Contact &amp; Enquiries</h2>
              <div className="rule" />
            </Reveal>
            <div className="contacts-grid">
              <Reveal delay={80}>
                <div className="cg-title">Organizing Committee</div>
                <div className="contact-list">
                  {COMMITTEE.map((c) => (
                    <div className="contact-card" key={c.name}>
                      <div className="cc-av">{c.initials}</div>
                      <div>
                        <div className="cc-name">{c.name}</div>
                        <div className="cc-role">{c.role}</div>
                        <a href={`tel:${c.tel}`} className="cc-phone">📞 {c.phone}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div className="cg-title">Secretariat Contacts</div>
                <div className="contact-list">
                  {SECRETARIAT.map((c) => (
                    <div className="contact-card" key={c.name}>
                      <div className="cc-av">{c.initials}</div>
                      <div>
                        <div className="cc-name">{c.name}</div>
                        <div className="cc-role">{c.role}</div>
                        <a href={`tel:${c.tel}`} className="cc-phone">📞 {c.phone}</a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sec-box">
                  <div className="sec-box-title">📮 Conference Secretariat</div>
                  <div className="sec-row"><span>✉️</span><a href={`mailto:${SECRETARIAT_EMAIL}`}>{SECRETARIAT_EMAIL}</a></div>
                  <div className="sec-row"><span>🌐</span><a href="https://www.asm.org" target="_blank" rel="noopener noreferrer">www.asm.org</a></div>
                  <div style={{ marginTop: 20 }}>
                    <button className="btn btn-secondary btn-block" onClick={openContactModal}>✉️ Send a Message</button>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ PARTNERSHIP & SPONSORSHIP ═══ */}
        <section id="partners" className="section section-dark" aria-labelledby="partners-heading">
          <div className="wrap">
            <Reveal>
              <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Partner With Us</span>
              <h2 className="headline" id="partners-heading" style={{ color: "#fff" }}>
                Partnership &amp; Sponsorship
              </h2>
              <div className="rule" />
              <p className="body-lg" style={{ color: "rgba(255,255,255,.7)" }}>
                ASM Nigeria 2026 brings together researchers, clinicians, policymakers, and industry
                leaders from across Nigeria and beyond. Partnering with the conference puts your
                organization in front of this community — through exhibition space, brand visibility,
                and direct engagement with the next generation of microbial scientists.
              </p>
            </Reveal>
            <div className="why-grid" style={{ marginTop: 40 }}>
              {PARTNER_BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={(i % 4) * 80} className="why-card why-card-dark">
                  <div className={`why-icon ${b.accent}`}>{b.icon}</div>
                  <h3 className="why-title" style={{ color: "#fff" }}>{b.title}</h3>
                  <p className="why-desc" style={{ color: "rgba(255,255,255,.6)" }}>{b.desc}</p>
                </Reveal>
              ))}
            </div>
            {PARTNERS.length > 0 && (
              <Reveal delay={120} className="partner-logos-block">
                <h3 className="partner-logos-heading">Our Partners &amp; Sponsors</h3>
                <div className="partner-carousel">
                  <button
                    type="button"
                    className="pc-arrow pc-arrow-left"
                    onClick={() => scrollPartners(-1)}
                    aria-label="Scroll partners left"
                  >
                    ‹
                  </button>
                  <div className="pc-track" ref={partnersScrollRef}>
                    {PARTNERS.map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pc-card"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.logo} alt={p.name} className="pc-logo" />
                        <div className="pc-name">{p.name}</div>
                        <div className="pc-desc">{p.desc}</div>
                      </a>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="pc-arrow pc-arrow-right"
                    onClick={() => scrollPartners(1)}
                    aria-label="Scroll partners right"
                  >
                    ›
                  </button>
                </div>
              </Reveal>
            )}
            <Reveal delay={160} className="partners-cta">
              <p>Interested in partnering or sponsoring? We&apos;ll share tiers, packages, and pricing directly.</p>
              <button className="btn btn-primary" onClick={openContactModal}>🤝 Become a Partner</button>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer role="contentinfo">
        <div className="footer-top">
          <div className="wrap">
            <div className="footer-grid">
              <div className="footer-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/asm-logo.png"
                  alt="ASM — Microbes Make Our World"
                  style={{ height: 36, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 12, display: "block" }}
                />
                <div className="fb-tagline">One Health. One Future. One Scientific Community.</div>
                <div className="fb-desc">The Maiden ASM Nigeria Conference brings together One Health scientists and stakeholders for four days of science, dialogue, and discovery in Abuja.</div>
              </div>
              <div className="footer-col">
                <h4>Conference</h4>
                <ul>
                  <li><a href="#why">Why Attend</a></li>
                  <li><a href="#themes">Sub-Themes</a></li>
                  <li><a href="#programme">Programme</a></li>
                  <li><a href="#speakers">Speakers</a></li>
                  <li><a href="#planning-committee">Planning Committee</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Participate</h4>
                <ul>
                  <li><Link href="/register">Submit Abstract</Link></li>
                  <li><a href="#registration">Register</a></li>
                  <li><a href="#payment">Payment</a></li>
                  <li><a href="#accommodation">Accommodation</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Information</h4>
                <ul>
                  <li><a href="#venue">Venue</a></li>
                  <li><a href="#faq">FAQ</a></li>
                  <li><a href="#contacts">Contact</a></li>
                  <li><Link href="/terms">Terms</Link></li>
                  <li><Link href="/privacy">Privacy</Link></li>
                  <li><a href="https://www.asm.org" target="_blank" rel="noopener noreferrer">ASM Global ↗</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="wrap">
            &copy; 2026 ASM Country Ambassador to Nigeria Project Fund
          </div>
        </div>
      </footer>

      {/* ═══ CONTACT MODAL ═══ */}
      <div
        className={contactOpen ? "overlay open" : "overlay"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(e) => { if (e.target === e.currentTarget) setContactOpen(false) }}
      >
        <div className="modal">
          <button className="modal-close" onClick={() => setContactOpen(false)} aria-label="Close contact form">✕</button>
          <h2 id="contact-modal-title">Send a Message</h2>
          <p className="modal-sub">We&apos;ll respond within 2 working days.</p>
          <form onSubmit={handleContactSubmit} noValidate>
            {contactError && <p className="form-note">{contactError}</p>}
            <div className="form-group">
              <label className="form-label" htmlFor="c-name">Your Name <span className="req">*</span></label>
              <input id="c-name" className="form-control" type="text" placeholder="Dr. John Smith" required autoComplete="name"
                value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="c-email">Email Address <span className="req">*</span></label>
              <input id="c-email" className="form-control" type="email" placeholder="you@example.com" required autoComplete="email"
                value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="c-subject">Subject</label>
              <select id="c-subject" className="form-control form-select"
                value={contactForm.subject} onChange={(e) => setContactForm((f) => ({ ...f, subject: e.target.value }))}>
                <option>General Enquiry</option>
                <option>Abstract Submission</option>
                <option>Registration Help</option>
                <option>Payment Confirmation</option>
                <option>Accommodation</option>
                <option>Speaking Opportunity</option>
                <option>Sponsorship</option>
                <option>Media / Press</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="c-msg">Message <span className="req">*</span></label>
              <textarea id="c-msg" className="form-control" rows={4} placeholder="Write your message here…" required style={{ resize: "vertical" }}
                value={contactForm.message} onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            {/* Honeypot -- hidden from real visitors, left blank; bots that fill every field trip it. */}
            <div className="honeypot-field" aria-hidden="true">
              <label htmlFor="c-company">Company</label>
              <input id="c-company" type="text" tabIndex={-1} autoComplete="off"
                value={contactForm.company} onChange={(e) => setContactForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={contactStatus === "pending"}>
              {contactStatus === "pending" ? "Sending…" : "📤 Send Message"}
            </button>
          </form>
        </div>
      </div>

      <div className={toast ? "toast show" : "toast"} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
