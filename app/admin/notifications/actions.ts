"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { sendNotification } from "@/lib/notifications"

export type ActionResult = { error: string } | { success: true }

export async function retryNotificationAction(notificationId: string): Promise<ActionResult> {
  await requireRole("admin")
  await sendNotification(notificationId)
  revalidatePath("/admin/notifications")
  return { success: true }
}
