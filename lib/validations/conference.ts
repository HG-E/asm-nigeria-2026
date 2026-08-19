import { z } from "zod"

export const conferenceSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  theme: z.string().trim().optional().or(z.literal("")),
  tagline: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().min(1, "Location is required"),
  venue: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  earlySubmissionDeadline: z.string().optional().or(z.literal("")),
  lateSubmissionDeadline: z.string().optional().or(z.literal("")),
  reviewDeadline: z.string().optional().or(z.literal("")),
  decisionDate: z.string().optional().or(z.literal("")),
  abstractWordLimit: z.number().int().min(50).max(2000),
  maxFileSizeMb: z.number().int().min(1).max(50),
  secretariatEmail: z.email("Enter a valid email address").optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  submissionsOpen: z.boolean(),
  submissionFeeNgn: z.number().min(0).optional(),
  submissionFeeUsd: z.number().min(0).optional(),
  paymentAccountDetails: z.string().trim().optional().or(z.literal("")),
})
export type ConferenceSettingsInput = z.infer<typeof conferenceSettingsSchema>
