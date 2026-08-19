import { z } from "zod"

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z.string().trim().min(1),
  message: z.string().trim().min(1, "Please enter your message."),
  // Honeypot -- real visitors never see or fill this field, bots often do.
  company: z.string().max(0).optional().or(z.literal("")),
})
export type ContactMessageInput = z.infer<typeof contactMessageSchema>
