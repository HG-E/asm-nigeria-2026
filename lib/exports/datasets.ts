import "server-only"

import { isStructured } from "@/lib/abstract-structure"
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
  {
    slug: "book-of-abstracts",
    label: "Book of Abstracts (accepted)",
    description:
      "Accepted abstracts in Book-of-Abstracts order (by sub-theme, then reference), with numbered author affiliations and Background / Methods / Results / Conclusion in separate columns. Abstracts submitted before the four-part structure appear as one block in 'Full Abstract (unstructured)'.",
    async fetch(supabase) {
      const { data } = await supabase
        .from("submissions")
        .select(
          "reference_number, title, keywords, status, presentation_preference, current_version, conference_subthemes(name, sort_order), submission_authors(author_order, is_corresponding, first_name, last_name, institution, country, email), submission_versions(version_number, abstract_text, abstract_text_original, abstract_background, abstract_methods, abstract_results, abstract_conclusion)"
        )
        .in("status", ACCEPTED_STATUSES)

      const sorted = [...(data ?? [])].sort(
        (a, b) =>
          (a.conference_subthemes?.sort_order ?? 99) - (b.conference_subthemes?.sort_order ?? 99) ||
          (a.reference_number ?? "").localeCompare(b.reference_number ?? "", undefined, { numeric: true })
      )

      const headers = [
        "Sub-theme No.",
        "Sub-theme",
        "Reference Number",
        "Presentation",
        "Title",
        "Authors",
        "Affiliations",
        "Corresponding Author",
        "Corresponding Email",
        "Keywords",
        "Background",
        "Methods",
        "Results",
        "Conclusion",
        "Full Abstract (unstructured)",
        "Format",
      ]

      const rows = sorted.map((s): ExportCell[] => {
        const authors = [...s.submission_authors].sort((a, b) => a.author_order - b.author_order)
        // Affiliations numbered in order of first appearance, shared between
        // authors from the same institution -- the standard Book of Abstracts
        // author line.
        const affiliations: string[] = []
        const authorLine = authors
          .map((a) => {
            const affiliation = [a.institution, a.country].filter(Boolean).join(", ")
            let idx = affiliations.indexOf(affiliation)
            if (idx === -1) {
              affiliations.push(affiliation)
              idx = affiliations.length - 1
            }
            return `${a.first_name} ${a.last_name}${toSuperscript(idx + 1)}${a.is_corresponding ? "*" : ""}`
          })
          .join(", ")
        const corresponding = authors.find((a) => a.is_corresponding)
        const version = s.submission_versions.find((v) => v.version_number === s.current_version)
        const structured = version ? isStructured(version) : false
        const presentation =
          s.status === "accepted_oral"
            ? "Oral"
            : s.status === "accepted_poster"
              ? "Poster"
              : s.presentation_preference

        return [
          s.conference_subthemes?.sort_order ?? "",
          s.conference_subthemes?.name ?? "",
          s.reference_number,
          presentation,
          s.title,
          authorLine,
          affiliations.map((a, i) => `${toSuperscript(i + 1)}${a}`).join("; "),
          corresponding ? `${corresponding.first_name} ${corresponding.last_name}` : "",
          corresponding?.email ?? "",
          (s.keywords ?? []).join("; "),
          structured ? version!.abstract_background : "",
          structured ? version!.abstract_methods : "",
          structured ? version!.abstract_results : "",
          structured ? version!.abstract_conclusion : "",
          structured ? "" : (version?.abstract_text ?? ""),
          structured
            ? version?.abstract_text_original
              ? "Structured (restructured after acceptance)"
              : "Structured"
            : "Legacy (free text)",
        ]
      })
      return { headers, rows }
    },
  },
]

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]
function toSuperscript(n: number) {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)])
    .join("")
}

export function getDataset(slug: string): ExportDataset | undefined {
  return EXPORT_DATASETS.find((d) => d.slug === slug)
}
