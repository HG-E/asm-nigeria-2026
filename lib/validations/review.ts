import { z } from "zod"

export const conflictDeclarationSchema = z.object({
  hasConflict: z.boolean(),
  conflictReason: z.string().trim().optional().or(z.literal("")),
})
export type ConflictDeclarationInput = z.infer<typeof conflictDeclarationSchema>

const scoreSchema = z.number().int().min(1).max(5)

export const reviewSchema = z.object({
  scoreOriginality: scoreSchema,
  scoreRelevance: scoreSchema,
  scoreMethodology: scoreSchema,
  scoreClarity: scoreSchema,
  scoreSignificance: scoreSchema,
  recommendation: z.enum([
    "accepted_oral",
    "accepted_poster",
    "accepted",
    "minor_revision",
    "major_revision",
    "rejected",
  ]),
  commentsToCommittee: z.string().trim().min(1, "Comments to the scientific committee are required"),
  commentsToAuthor: z.string().trim().optional().or(z.literal("")),
})
export type ReviewInput = z.infer<typeof reviewSchema>
