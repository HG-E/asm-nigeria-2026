import { z } from "zod"

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    professionalTitle: z.string().trim().min(1, "Professional title is required"),
    institution: z.string().trim().min(1, "Institution is required"),
    department: z.string().trim().min(1, "Department/unit is required"),
    country: z.string().trim().min(1, "Country is required"),
    phone: z.string().trim().min(1, "Phone number is required"),
    orcid: z.string().trim().optional().or(z.literal("")),
    agreeToTerms: z.literal(true, {
      error: "You must accept the conference terms and declaration",
    }),
    agreeToPrivacy: z.literal(true, {
      error: "You must acknowledge the privacy/data-use policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
