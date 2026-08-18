import { z } from "zod"

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  asmIdNumber: z
    .string()
    .trim()
    .regex(/^\d{7,9}$/, "ASM ID Number must be 7 to 9 digits, numbers only"),
  professionalTitle: z.string().trim().min(1, "Professional title is required"),
  institution: z.string().trim().min(1, "Institution is required"),
  department: z.string().trim().min(1, "Department/unit is required"),
  country: z.string().trim().min(1, "Country is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  orcid: z.string().trim().optional().or(z.literal("")),
})

export type ProfileInput = z.infer<typeof profileSchema>
