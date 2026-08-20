import { z } from "zod"

import { PARTICIPANT_CATEGORIES } from "@/lib/registration-fees"

export const ATTENDANCE_MODES = ["Virtual", "Physical", "Both"] as const

export const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your full name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().min(1, "Please enter your phone number."),
  institution: z.string().trim().min(1, "Please enter your institution."),
  participantCategory: z.enum(PARTICIPANT_CATEGORIES, { error: "Select your participant category." }),
  attendanceMode: z.enum(ATTENDANCE_MODES, { error: "Select whether you'll attend virtually or physically." }),
  includeWorkshop: z.boolean(),
  // Honeypot -- see contact form's schema for why this stays unconstrained.
  company: z.string().optional(),
})
export type RegistrationInput = z.infer<typeof registrationSchema>
