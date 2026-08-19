import { z } from "zod"

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z.string().trim().min(1),
  message: z.string().trim().min(1, "Please enter your message."),
  // Honeypot -- real visitors never see or fill this field, bots often do.
  // Deliberately unconstrained: it must always pass validation so a filled
  // value reaches the action's own check below, instead of surfacing a
  // validation error that would tip off the bot (or just confuse a real
  // visitor whose autofill reached the hidden field).
  company: z.string().optional(),
})
export type ContactMessageInput = z.infer<typeof contactMessageSchema>
