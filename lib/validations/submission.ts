import { z } from "zod"

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

export const step3Schema = z.object({
  abstractText: z.string().trim().min(1, "Abstract content is required"),
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

export function countWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
