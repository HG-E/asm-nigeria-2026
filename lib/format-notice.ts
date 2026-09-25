import "server-only"

import {
  ABSTRACT_SECTIONS,
  ABSTRACT_TOTAL_MAX,
  BOOK_RESTRUCTURE_DEADLINE_LABEL,
  isStructured,
} from "@/lib/abstract-structure"
import { getActiveConference } from "@/lib/conference"
import { TEST_RECIPIENT_PATTERN } from "@/lib/email"
import { escapeHtml } from "@/lib/html"
import { createAdminClient } from "@/lib/supabase/admin"

// The one-off (and re-runnable, as a reminder) notice telling authors whose
// abstract predates the four-part structure what to do and by when. Who is
// included is computed from live data every time -- never from a stored list --
// so an author who has already fixed their abstract silently drops out, and an
// author with several outstanding abstracts gets ONE email covering all of them.

export const FORMAT_NOTICE_TYPE = "abstract_format_notice"
export const FORMAT_NOTICE_SUBJECT = "Action needed: format your abstract in four parts (ASM Nigeria 2026)"

export type NoticeKind = "accepted" | "draft" | "revision"

export type NoticeItem = {
  submissionId: string
  reference: string
  title: string
  kind: NoticeKind
  deadlineLabel: string
  // Revision deadline already behind us -- the email must not present a past
  // date as if it were still upcoming.
  overdue?: boolean
}

export type NoticeTarget = {
  authorId: string
  email: string
  firstName: string
  items: NoticeItem[]
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  })
}

const ACCEPTED = ["accepted", "accepted_oral", "accepted_poster"]

// includeTestAddresses exists only so the queue/batch logic can be exercised
// with disposable @example.com authors; real sends always exclude them.
export async function getFormatNoticeTargets(
  onlyAuthorId?: string,
  includeTestAddresses = false
): Promise<NoticeTarget[]> {
  const admin = createAdminClient()
  const conference = await getActiveConference()
  const finalDeadline = conference?.late_submission_deadline
    ? formatDate(conference.late_submission_deadline)
    : "the final submission deadline"

  let query = admin
    .from("submissions")
    .select(
      "id, reference_number, title, status, current_version, corresponding_author_id, submission_versions(version_number, abstract_text, abstract_background, abstract_methods, abstract_results, abstract_conclusion)"
    )
    .in("status", ["accepted", "accepted_oral", "accepted_poster", "draft", "revision_required"])
  if (onlyAuthorId) query = query.eq("corresponding_author_id", onlyAuthorId)
  const { data: submissions } = await query

  const revisionIds = (submissions ?? []).filter((s) => s.status === "revision_required").map((s) => s.id)
  const revisionDeadlines = new Map<string, { label: string; overdue: boolean }>()
  if (revisionIds.length > 0) {
    const { data: decisions } = await admin
      .from("decisions")
      .select("submission_id, revision_deadline, created_at")
      .in("submission_id", revisionIds)
      .order("created_at", { ascending: false })
    for (const d of decisions ?? []) {
      if (d.revision_deadline && !revisionDeadlines.has(d.submission_id)) {
        revisionDeadlines.set(d.submission_id, {
          label: formatDate(d.revision_deadline),
          overdue: new Date(d.revision_deadline).getTime() < Date.now(),
        })
      }
    }
  }

  const byAuthor = new Map<string, NoticeItem[]>()
  for (const s of submissions ?? []) {
    const versions = s.submission_versions ?? []
    const current = versions.find((v) => v.version_number === s.current_version)
    let item: NoticeItem | null = null

    if (ACCEPTED.includes(s.status)) {
      if (current && !isStructured(current)) {
        item = { kind: "accepted", deadlineLabel: BOOK_RESTRUCTURE_DEADLINE_LABEL } as NoticeItem
      }
    } else if (s.status === "draft") {
      // An empty draft has nothing to migrate; it will simply meet the new form.
      if (current?.abstract_text?.trim() && !isStructured(current)) {
        item = { kind: "draft", deadlineLabel: finalDeadline } as NoticeItem
      }
    } else if (s.status === "revision_required") {
      const revised = versions.find((v) => v.version_number === s.current_version + 1)
      if (!(revised && isStructured(revised))) {
        const rd = revisionDeadlines.get(s.id)
        item = {
          kind: "revision",
          deadlineLabel: rd?.label ?? "the deadline the committee set for your revision",
          overdue: rd?.overdue ?? false,
        } as NoticeItem
      }
    }

    if (item) {
      item.submissionId = s.id
      item.reference = s.reference_number ?? ""
      item.title = s.title
      const list = byAuthor.get(s.corresponding_author_id) ?? []
      list.push(item)
      byAuthor.set(s.corresponding_author_id, list)
    }
  }

  if (byAuthor.size === 0) return []
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id, email, first_name")
    .in("id", [...byAuthor.keys()])

  const targets: NoticeTarget[] = []
  for (const p of profiles ?? []) {
    if (!p.email || (!includeTestAddresses && TEST_RECIPIENT_PATTERN.test(p.email))) continue
    targets.push({
      authorId: p.id,
      email: p.email,
      firstName: p.first_name ?? "",
      items: (byAuthor.get(p.id) ?? []).sort((a, b) => a.reference.localeCompare(b.reference)),
    })
  }
  return targets.sort((a, b) => a.email.localeCompare(b.email))
}

const KIND_TEXT: Record<NoticeKind, (deadline: string, overdue?: boolean) => string> = {
  accepted: (d) =>
    `Accepted &mdash; please rewrite it into the four parts by <strong>${escapeHtml(d)}</strong>, for the Book of Abstracts.`,
  draft: (d) =>
    `Draft &mdash; please rewrite it into the four parts before you submit. Final abstract submission closes <strong>${escapeHtml(d)}</strong>.`,
  revision: (d, overdue) =>
    overdue
      ? `Revision requested &mdash; the revision form now uses the four parts. Your revision deadline (${escapeHtml(d)}) has passed, so please submit it <strong>as soon as possible</strong>, or reply to this email if you need more time.`
      : `Revision requested &mdash; the revision form now uses the four parts. Revision deadline: <strong>${escapeHtml(d)}</strong>.`,
}

// The email body (the branded shell and greeting are added by notifications.ts).
// Returns null when nothing is outstanding any more, so a stale request is
// never sent.
export async function renderFormatNoticeBody(
  authorId: string,
  baseUrl: string,
  includeTestAddresses = false
): Promise<string | null> {
  const [target] = await getFormatNoticeTargets(authorId, includeTestAddresses)
  if (!target) return null

  const limits = ABSTRACT_SECTIONS.map(
    (s) =>
      `<tr><td style="padding:6px 12px; border-bottom:1px solid #e2e5ea;"><strong>${s.label}</strong></td><td style="padding:6px 12px; border-bottom:1px solid #e2e5ea;">maximum ${s.max} words</td></tr>`
  ).join("")

  const items = target.items
    .map(
      (item) => `
        <div style="margin:0 0 14px; padding:14px 16px; background:#eef2fa; border-radius:6px;">
          <div style="font-size:13px; color:#003087; font-weight:bold;">${item.reference ? escapeHtml(item.reference) : "Draft (no reference number yet)"}</div>
          <div style="margin:2px 0 8px;">${escapeHtml(item.title)}</div>
          <div style="font-size:14px; margin-bottom:10px;">${KIND_TEXT[item.kind](item.deadlineLabel, item.overdue)}</div>
          <a href="${baseUrl}/author/submissions/${item.submissionId}" style="display:inline-block; background:#003087; color:#ffffff; font-weight:bold; text-decoration:none; padding:10px 22px; border-radius:6px; font-size:14px;">Open this abstract</a>
        </div>`
    )
    .join("")

  const many = target.items.length > 1
  return `
    <h2 style="margin:0 0 14px; font-family: Georgia, 'Times New Roman', serif; color:#001f5b; font-size:19px; font-weight:bold;">Action needed: format your abstract in four parts</h2>
    <p>So that every abstract is read fairly &mdash; and prints consistently in the ASM Nigeria 2026 Book of Abstracts &mdash; abstracts are now written in four parts, ${ABSTRACT_TOTAL_MAX} words in total:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 18px; font-size:14px; border:1px solid #e2e5ea; border-radius:6px;">${limits}</table>
    <p>${many ? "These abstracts were" : "This abstract was"} written before the change, so ${many ? "they need" : "it needs"} to be rewritten into the four parts. Your original wording is shown next to the boxes so you can copy from it &mdash; this is a restructure, not a new submission.</p>
    ${items}
    <p style="margin-top:22px; margin-bottom:0;">Thank you for your cooperation.</p>
    <p style="margin-top:14px; margin-bottom:0;">Best regards,<br><strong>ASM Nigeria 2026 &mdash; Scientific Programme Committee</strong></p>
  `
}
