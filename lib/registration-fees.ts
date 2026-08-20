// Single source of truth for conference (attendance) registration fees --
// mirrors the fee tables shown on the landing page (components/marketing/
// landing-page.tsx EARLY_FEES/LATE_FEES) so the registration form's amounts
// can't drift from what visitors see before they register. Kept as a
// separate module (not imported by the landing page, which stays fully
// static per an earlier decision) so this is the one place to update if
// the fee schedule changes.

export const REGISTRATION_PERIOD_CUTOFF = "2026-10-22T23:59:59+01:00"

export const PARTICIPANT_CATEGORIES = [
  "ASM Members",
  "Non-Members",
  "Postgraduate Students",
  "Undergraduate Students",
  "International Participants",
  "Online Participants — Local",
  "Online Participants — Foreign",
  "Foreign Corporate Bodies",
] as const

export type ParticipantCategory = (typeof PARTICIPANT_CATEGORIES)[number]

type FeeRow = { early: string; late: string; currency: "NGN" | "USD" }

export const REGISTRATION_FEES: Record<ParticipantCategory, FeeRow> = {
  "ASM Members": { early: "₦25,000", late: "₦30,000", currency: "NGN" },
  "Non-Members": { early: "₦30,000", late: "₦35,000", currency: "NGN" },
  "Postgraduate Students": { early: "₦15,000", late: "₦20,000", currency: "NGN" },
  "Undergraduate Students": { early: "₦5,000", late: "₦8,000", currency: "NGN" },
  "International Participants": { early: "$50 USD", late: "$55 USD", currency: "USD" },
  "Online Participants — Local": { early: "₦25,000", late: "₦30,000", currency: "NGN" },
  "Online Participants — Foreign": { early: "$25 USD", late: "$30 USD", currency: "USD" },
  "Foreign Corporate Bodies": { early: "$150 USD", late: "$155 USD", currency: "USD" },
}

export const WORKSHOP_FEE = { early: "₦4,000", late: "₦8,000" }

export function currentRegistrationPeriod(): "early" | "late" {
  return Date.now() <= new Date(REGISTRATION_PERIOD_CUTOFF).getTime() ? "early" : "late"
}

export function feeFor(category: ParticipantCategory, period: "early" | "late") {
  return REGISTRATION_FEES[category][period]
}
