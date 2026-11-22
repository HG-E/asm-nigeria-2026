import { z } from "zod"

import { PARTICIPANT_CATEGORIES } from "@/lib/registration-fees"

export const ATTENDANCE_MODES = ["Virtual", "In-person", "Both"] as const

// No .refine() requiring "subcommittee" when the category is "Committee
// Member" here -- that field isn't a react-hook-form-managed input (the
// registration form collects it via local checkbox state and joins it into
// one string right before submitting), so a cross-field refine on this
// schema would validate against a value react-hook-form never actually
// holds, silently failing zodResolver on every submit with no rendered
// FormField to show the error on. The equivalent check instead lives in
// app/register-conference/actions.ts, against the real submitted FormData.
export const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your full name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().min(1, "Please enter your phone number."),
  institution: z.string().trim().min(1, "Please enter your institution."),
  participantCategory: z.enum(PARTICIPANT_CATEGORIES, { error: "Select your participant category." }),
  attendanceMode: z.enum(ATTENDANCE_MODES, { error: "Select whether you'll attend virtually or in-person." }),
  includeWorkshop: z.boolean(),
  // Free text -- the registration form combines one or more selected
  // subcommittees (someone can serve on more than one) plus an optional
  // "Other / not listed" entry into this single field before submitting.
  subcommittee: z.string().trim().optional(),
  // Honeypot -- see contact form's schema for why this stays unconstrained.
  company: z.string().optional(),
})
export type RegistrationInput = z.infer<typeof registrationSchema>
