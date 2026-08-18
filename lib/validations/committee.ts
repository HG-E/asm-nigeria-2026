import { z } from "zod"

export const addCommitteeMemberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  asmIdNumber: z
    .string()
    .trim()
    .regex(/^\d{7,9}$/, "ASM ID Number must be 7 to 9 digits, numbers only")
    .optional()
    .or(z.literal("")),
  institution: z.string().trim().min(1, "Institution is required"),
  title: z.string().trim().optional().or(z.literal("")),
})
export type AddCommitteeMemberInput = z.infer<typeof addCommitteeMemberSchema>
