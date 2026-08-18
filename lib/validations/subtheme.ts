import { z } from "zod"

export const subthemeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean(),
})
export type SubthemeInput = z.infer<typeof subthemeSchema>
