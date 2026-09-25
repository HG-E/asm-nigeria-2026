import "server-only"

import {
  FORMAT_NOTICE_SUBJECT,
  FORMAT_NOTICE_TYPE,
  getFormatNoticeTargets,
} from "@/lib/format-notice"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"

const REMINDER_AFTER_DAYS = 7

export type FormatNoticeBatchResult = {
  sentThisBatch: number
  remaining: number
  totalAuthors: number
}

// Queues (idempotently) and sends the format notice in small batches. Sending
// is driven by repeated calls rather than one long request because SMTP round
// trips are slow (several seconds each) and a single request for ~40 authors
// could hit the host's time limit partway, leaving some authors silently
// unsent. Each call does a few, and reports how many are left.
//
// Safe to click twice or to run concurrently by accident: an author who already
// has a pending or recently sent notice is never queued again. `remind: true`
// re-queues authors who were sent one more than REMINDER_AFTER_DAYS ago and
// still have something outstanding -- so the same button doubles as a reminder.
export async function sendFormatNoticeBatch(options: {
  batchSize?: number
  remind?: boolean
  includeTestAddresses?: boolean
  // Restricts everything (targets, queueing, sending) to these authors -- used by
  // tests so they can never touch a real author's queue.
  onlyAuthorIds?: string[]
}): Promise<FormatNoticeBatchResult> {
  const batchSize = options.batchSize ?? 5
  const admin = createAdminClient()
  const all = await getFormatNoticeTargets(undefined, options.includeTestAddresses)
  const only = options.onlyAuthorIds ? new Set(options.onlyAuthorIds) : null
  const targets = only ? all.filter((t) => only.has(t.authorId)) : all
  const targetIds = new Set(targets.map((t) => t.authorId))

  let existingQuery = admin
    .from("notifications")
    .select("id, recipient_id, status, created_at")
    .eq("notification_type", FORMAT_NOTICE_TYPE)
  if (options.onlyAuthorIds) existingQuery = existingQuery.in("recipient_id", options.onlyAuthorIds)
  const { data: existing } = await existingQuery

  const hasPending = new Set<string>()
  const lastSent = new Map<string, number>()
  for (const n of existing ?? []) {
    if (n.status === "pending") hasPending.add(n.recipient_id)
    if (n.status === "sent") {
      lastSent.set(n.recipient_id, Math.max(lastSent.get(n.recipient_id) ?? 0, new Date(n.created_at).getTime()))
    }
  }

  // A queued notice whose author has since fixed everything shouldn't go out.
  const stalePendingIds = (existing ?? [])
    .filter((n) => n.status === "pending" && !targetIds.has(n.recipient_id))
    .map((n) => n.id)
  if (stalePendingIds.length > 0) {
    await admin.from("notifications").delete().in("id", stalePendingIds)
  }

  const cutoff = Date.now() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000
  const toQueue = targets.filter((t) => {
    if (hasPending.has(t.authorId)) return false
    const sentAt = lastSent.get(t.authorId)
    if (sentAt === undefined) return true
    return Boolean(options.remind) && sentAt < cutoff
  })
  if (toQueue.length > 0) {
    await admin.from("notifications").insert(
      toQueue.map((t) => ({
        recipient_id: t.authorId,
        recipient_email: t.email,
        submission_id: null,
        notification_type: FORMAT_NOTICE_TYPE,
        subject: FORMAT_NOTICE_SUBJECT,
        status: "pending" as const,
      }))
    )
  }

  let pendingQuery = admin
    .from("notifications")
    .select("id")
    .eq("notification_type", FORMAT_NOTICE_TYPE)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  if (options.onlyAuthorIds) pendingQuery = pendingQuery.in("recipient_id", options.onlyAuthorIds)
  const { data: pending } = await pendingQuery

  const pendingIds = (pending ?? []).map((n) => n.id)
  const batch = pendingIds.slice(0, batchSize)
  await sendNotifications(batch)

  // A send that failed is left as "failed" (visible with a Retry button on the
  // log) rather than retried forever here; only genuinely unsent rows count.
  return {
    sentThisBatch: batch.length,
    remaining: pendingIds.length - batch.length,
    totalAuthors: targets.length,
  }
}

export async function getFormatNoticeOverview() {
  const admin = createAdminClient()
  const [targets, { data: rows }] = await Promise.all([
    getFormatNoticeTargets(),
    admin.from("notifications").select("recipient_id, status").eq("notification_type", FORMAT_NOTICE_TYPE),
  ])
  const notified = new Set((rows ?? []).filter((n) => n.status === "sent").map((n) => n.recipient_id))
  const pending = (rows ?? []).filter((n) => n.status === "pending").length
  return {
    targets: targets.map((t) => ({ ...t, alreadyNotified: notified.has(t.authorId) })),
    pending,
    notifiedCount: targets.filter((t) => notified.has(t.authorId)).length,
  }
}
