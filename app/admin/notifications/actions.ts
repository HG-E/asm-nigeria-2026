"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { sendFormatNoticeBatch } from "@/lib/format-notice-send"
import { sendNotification } from "@/lib/notifications"

export type ActionResult = { error: string } | { success: true }

export type FormatNoticeBatchActionResult =
  | { error: string }
  | { success: true; sentThisBatch: number; remaining: number; totalAuthors: number }

// Called repeatedly by the panel until `remaining` reaches 0 -- see
// sendFormatNoticeBatch for why this is batched rather than one long request.
export async function sendFormatNoticeBatchAction(remind: boolean): Promise<FormatNoticeBatchActionResult> {
  await requireRole("admin")
  try {
    const result = await sendFormatNoticeBatch({ remind })
    revalidatePath("/admin/notifications")
    return { success: true, ...result }
  } catch {
    return { error: "Could not send this batch. Nothing further was sent; open the log to see what went out." }
  }
}

export async function retryNotificationAction(notificationId: string): Promise<ActionResult> {
  await requireRole("admin")
  await sendNotification(notificationId)
  revalidatePath("/admin/notifications")
  return { success: true }
}
