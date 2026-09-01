import { z } from "zod"

export const addRegistrationDeskMemberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  institution: z.string().trim().optional().or(z.literal("")),
})
export type AddRegistrationDeskMemberInput = z.infer<typeof addRegistrationDeskMemberSchema>
