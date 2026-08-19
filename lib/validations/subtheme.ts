import { z } from "zod"

export const subthemeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, "Code must be 2-6 letters, e.g. AMR"),
  isActive: z.boolean(),
})
export type SubthemeInput = z.infer<typeof subthemeSchema>
