import { z } from "zod"

import {
  ABSTRACT_SECTIONS,
  countWords,
  normalizeSection,
} from "@/lib/abstract-structure"

export { countWords }

export const step1Schema = z.object({
  title: z.string().trim().min(1, "Abstract title is required"),
  subthemeId: z.string().min(1, "Select a scientific subtheme"),
  keywords: z.array(z.string().trim().min(1)),
  presentationPreference: z.enum(["oral", "poster", "either"]),
})
export type Step1Input = z.infer<typeof step1Schema>

export const coAuthorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  institution: z.string().trim().min(1, "Institution is required"),
  department: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required"),
  email: z.email("Enter a valid email address"),
  orcid: z.string().trim().optional().or(z.literal("")),
})
export type CoAuthorInput = z.infer<typeof coAuthorSchema>

export const step2Schema = z.object({
  coAuthors: z.array(coAuthorSchema),
})
export type Step2Input = z.infer<typeof step2Schema>

// Per-section limits live in lib/abstract-structure.ts. Text is checked after
// the same normalization the server applies when saving (label stripping,
// whitespace collapse), so what the author sees counted is what is enforced.
// Per-section limits live in lib/abstract-structure.ts. Text is checked after
// the same normalization the server applies when saving (label stripping,
// whitespace collapse), so what the author sees counted is what is enforced.
export const step3Schema = z
  .object({
    background: z.string(),
    methods: z.string(),
    results: z.string(),
    conclusion: z.string(),
  })
  .superRefine((value, ctx) => {
    for (const section of ABSTRACT_SECTIONS) {
      const words = countWords(normalizeSection(section.key, value[section.key]))
      let message: string | null = null
      if (words === 0) message = `${section.label} is required.`
      else if (words < section.min)
        message = `Write at least ${section.min} words for ${section.label} (you have ${words}).`
      else if (words > section.max)
        message = `${section.label} is ${words} words, over the ${section.max}-word limit.`
      if (message) ctx.addIssue({ code: "custom", message, path: [section.key] })
    }
  })
export type Step3Input = z.infer<typeof step3Schema>

export const step4Schema = z.object({
  noConflictOfInterest: z.literal(true, {
    error: "You must declare there is no conflict of interest",
  }),
  ethicalApprovalObtained: z.literal(true, {
    error: "You must confirm ethical approval, where applicable",
  }),
  fundingDeclaration: z
    .string()
    .trim()
    .min(1, 'State your funding/support source, or write "None"'),
  originalityConfirmed: z.literal(true, {
    error: "You must confirm this work is original",
  }),
})
export type Step4Input = z.infer<typeof step4Schema>

// A submission can be withdrawn any time between formal submission and a
// final decision -- not while still a draft (nothing to withdraw from yet),
// and not once accepted/rejected/already withdrawn (decided).
export const WITHDRAWABLE_STATUSES = [
  "submitted",
  "screening",
  "assigned",
  "under_review",
  "reviews_completed",
  "decision_pending",
  "revision_required",
] as const

