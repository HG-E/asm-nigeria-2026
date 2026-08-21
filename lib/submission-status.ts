import type { Database } from "@/types/database"

type SubmissionStatus = Database["public"]["Enums"]["submission_status"]

// A bare status badge doesn't tell an author what's actually left to
// happen -- "Reviews completed" reads like an end state, but acceptance
// still requires the Scientific Committee to propose a decision AND an
// admin to finalize it. Spell out what's still pending rather than just
// the raw status label.
export const STATUS_HINTS: Partial<Record<SubmissionStatus, string>> = {
  submitted: "Awaiting screening by the Admin.",
  screening: "Being screened before reviewer assignment.",
  assigned: "Reviewer(s) assigned; review not yet started.",
  under_review: "Reviewer(s) are evaluating this abstract.",
  reviews_completed: "All reviews are in — awaiting the Scientific Committee's decision.",
  decision_pending: "A decision has been proposed — awaiting final confirmation.",
}
