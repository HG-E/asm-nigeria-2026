import { z } from "zod"

export const decisionSchema = z.object({
  decision: z.enum([
    "accepted",
    "accepted_oral",
    "accepted_poster",
    "minor_revision",
    "major_revision",
    "rejected",
  ]),
  decisionNotes: z.string().trim().min(1, "Notes to the record are required"),
  authorMessage: z.string().trim().optional().or(z.literal("")),
  revisionDeadline: z.string().optional().or(z.literal("")),
})
export type DecisionInput = z.infer<typeof decisionSchema>
