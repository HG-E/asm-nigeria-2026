import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ExportCell } from "@/lib/exports/format"
import type { Database } from "@/types/database"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type ExportDataset = {
  slug: string
  label: string
  description: string
  fetch: (supabase: SupabaseClient) => Promise<{ headers: string[]; rows: ExportCell[][] }>
}

const SUBMISSION_SELECT =
  "reference_number, title, status, payment_status, presentation_preference, submitted_at, current_version, conference_subthemes(name), user_profiles:corresponding_author_id(first_name, last_name, email, institution)"

function submissionRow(s: {
  reference_number: string | null
  title: string
  status: string
  payment_status: string
  presentation_preference: string
  submitted_at: string | null
  current_version: number
  conference_subthemes: { name: string } | null
  user_profiles: { first_name: string; last_name: string; email: string; institution: string | null } | null
}): ExportCell[] {
  return [
    s.reference_number,
    s.title,
    s.conference_subthemes?.name ?? "",
    s.status,
    s.payment_status,
    s.presentation_preference,
    s.user_profiles ? `${s.user_profiles.first_name} ${s.user_profiles.last_name}` : "",
    s.user_profiles?.email ?? "",
    s.user_profiles?.institution ?? "",
    s.submitted_at,
    s.current_version,
  ]
}

const SUBMISSION_HEADERS = [
  "Reference Number",
  "Title",
  "Subtheme",
  "Status",
  "Payment Status",
  "Presentation Preference",
  "Corresponding Author",
  "Email",
  "Institution",
  "Submitted At",
  "Version",
]

const ACCEPTED_STATUSES: Database["public"]["Enums"]["submission_status"][] = [
  "accepted",
  "accepted_oral",
  "accepted_poster",
]

export const EXPORT_DATASETS: ExportDataset[] = [
  {
    slug: "all-submissions",
    label: "All submissions",
    description: "Every submission regardless of status.",
    async fetch(supabase) {
      const { data } = await supabase.from("submissions").select(SUBMISSION_SELECT).order("created_at")
      return { headers: SUBMISSION_HEADERS, rows: (data ?? []).map(submissionRow) }
    },
  },
  {
    slug: "accepted-submissions",
    label: "Accepted submissions",
    description: "All accepted, accepted-oral, and accepted-poster submissions.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .in("status", ACCEPTED_STATUSES)
        .order("reference_number")
      return { headers: SUBMISSION_HEADERS, rows: (data ?? []).map(submissionRow) }
    },
  },
  {
    slug: "rejected-submissions",
    label: "Rejected submissions",
    description: "All submissions with a final rejection decision.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .eq("status", "rejected")
        .order("reference_number")
      return { headers: SUBMISSION_HEADERS, rows: (data ?? []).map(submissionRow) }
    },
  },
  {
    slug: "oral-presentations",
    label: "Oral presentations",
    description: "Submissions accepted for oral presentation.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .eq("status", "accepted_oral")
        .order("reference_number")
      return { headers: SUBMISSION_HEADERS, rows: (data ?? []).map(submissionRow) }
    },
  },
  {
    slug: "poster-presentations",
    label: "Poster presentations",
    description: "Submissions accepted for poster presentation.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submissions")
        .select(SUBMISSION_SELECT)
        .eq("status", "accepted_poster")
        .order("reference_number")
      return { headers: SUBMISSION_HEADERS, rows: (data ?? []).map(submissionRow) }
    },
  },
  {
    slug: "reviewer-assignments",
    label: "Reviewer assignments",
    description: "Every active reviewer assignment and its status.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("review_assignments")
        .select(
          "status, assigned_at, due_date, completed_at, submissions(reference_number, title, conference_subthemes(name)), user_profiles:reviewer_id(first_name, last_name, email)"
        )
        .eq("is_active", true)
        .order("assigned_at")
      const headers = [
        "Reference Number",
        "Title",
        "Subtheme",
        "Reviewer",
        "Reviewer Email",
        "Assignment Status",
        "Assigned At",
        "Due Date",
        "Completed At",
      ]
      const rows = (data ?? []).map((a): ExportCell[] => [
        a.submissions?.reference_number ?? "",
        a.submissions?.title ?? "",
        a.submissions?.conference_subthemes?.name ?? "",
        a.user_profiles ? `${a.user_profiles.first_name} ${a.user_profiles.last_name}` : "",
        a.user_profiles?.email ?? "",
        a.status,
        a.assigned_at,
        a.due_date,
        a.completed_at,
      ])
      return { headers, rows }
    },
  },
  {
    slug: "review-results",
    label: "Review results",
    description: "All submitted review scores and recommendations.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("reviews")
        .select(
          "score_originality, score_relevance, score_methodology, score_clarity, score_significance, average_score, recommendation, comments_to_committee, submitted_at, submissions(reference_number, title), user_profiles:reviewer_id(first_name, last_name)"
        )
        .eq("is_submitted", true)
        .order("submitted_at")
      const headers = [
        "Reference Number",
        "Title",
        "Reviewer",
        "Originality",
        "Relevance",
        "Methodology",
        "Clarity",
        "Significance",
        "Average Score",
        "Recommendation",
        "Comments to Committee",
        "Submitted At",
      ]
      const rows = (data ?? []).map((r): ExportCell[] => [
        r.submissions?.reference_number ?? "",
        r.submissions?.title ?? "",
        r.user_profiles ? `${r.user_profiles.first_name} ${r.user_profiles.last_name}` : "",
        r.score_originality,
        r.score_relevance,
        r.score_methodology,
        r.score_clarity,
        r.score_significance,
        r.average_score,
        r.recommendation,
        r.comments_to_committee,
        r.submitted_at,
      ])
      return { headers, rows }
    },
  },
  {
    slug: "final-decisions",
    label: "Final decisions",
    description: "All finalized committee decisions.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("decisions")
        .select(
          "decision, decision_notes, author_message, revision_deadline, created_at, submissions(reference_number, title), user_profiles:decided_by(first_name, last_name)"
        )
        .eq("is_final", true)
        .order("created_at")
      const headers = [
        "Reference Number",
        "Title",
        "Decision",
        "Decision Notes",
        "Author Message",
        "Revision Deadline",
        "Decided By",
        "Finalized At",
      ]
      const rows = (data ?? []).map((d): ExportCell[] => [
        d.submissions?.reference_number ?? "",
        d.submissions?.title ?? "",
        d.decision,
        d.decision_notes,
        d.author_message,
        d.revision_deadline,
        d.user_profiles ? `${d.user_profiles.first_name} ${d.user_profiles.last_name}` : "",
        d.created_at,
      ])
      return { headers, rows }
    },
  },
  {
    slug: "author-list",
    label: "Author list",
    description: "Every listed author (corresponding and co-authors) across all submissions.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submission_authors")
        .select(
          "author_order, is_corresponding, first_name, last_name, institution, department, country, email, orcid, submissions(reference_number, title)"
        )
        .order("author_order")
      const headers = [
        "Reference Number",
        "Title",
        "Author Order",
        "Corresponding",
        "First Name",
        "Last Name",
        "Institution",
        "Department",
        "Country",
        "Email",
        "ORCID",
      ]
      const rows = (data ?? []).map((a): ExportCell[] => [
        a.submissions?.reference_number ?? "",
        a.submissions?.title ?? "",
        a.author_order,
        a.is_corresponding ? "Yes" : "No",
        a.first_name,
        a.last_name,
        a.institution,
        a.department,
        a.country,
        a.email,
        a.orcid,
      ])
      return { headers, rows }
    },
  },
  {
    slug: "conference-registrations",
    label: "Conference Registrations",
    description: "All conference attendance registrations, for badge printing and check-in.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("conference_registrations")
        .select(
          "reference_number, full_name, email, phone, institution, participant_category, attendance_mode, payment_status, attended, created_at"
        )
        .order("created_at")
      const headers = [
        "Reference Number",
        "Full Name",
        "Email",
        "Phone",
        "Institution",
        "Participant Category",
        "Attendance Mode",
        "Payment Status",
        "Attended",
        "Registered At",
      ]
      const rows = (data ?? []).map((r): ExportCell[] => [
        r.reference_number,
        r.full_name,
        r.email,
        r.phone,
        r.institution,
        r.participant_category,
        r.attendance_mode,
        r.payment_status,
        r.attended ? "Yes" : "No",
        r.created_at,
      ])
      return { headers, rows }
    },
  },
]

export function getDataset(slug: string): ExportDataset | undefined {
  return EXPORT_DATASETS.find((d) => d.slug === slug)
}
