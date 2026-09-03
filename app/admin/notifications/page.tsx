import { CheckCheck, Clock, Layers, XCircle } from "lucide-react"

import { RetryNotificationButton } from "@/components/admin/retry-notification-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const TYPE_LABELS: Record<string, string> = {
  submission_acknowledgement: "Submission acknowledgement",
  reviewer_assignment: "Reviewer assignment",
  reviewer_reassignment: "Reviewer re-assignment",
  decision_notification: "Decision notification",
  payment_verified: "Payment verified",
  payment_rejected: "Payment rejected",
  submission_withdrawn: "Submission withdrawn",
  reviewer_conflict_needs_reassignment: "Reviewer conflict — needs reassignment",
  review_due_soon: "Review due soon (reminder)",
  review_overdue: "Review overdue (reminder)",
  revision_deadline_reminder: "Revision deadline (reminder)",
  submission_deadline_reminder: "Submission deadline (reminder)",
}

function statusVariant(status: string): "gold" | "secondary" | "destructive" | "outline" {
  if (status === "sent") return "gold"
  if (status === "failed") return "destructive"
  return "secondary"
}

export default async function AdminNotificationsPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, submissions(reference_number)")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = notifications ?? []
  const summary = {
    total: rows.length,
    sent: rows.filter((n) => n.status === "sent").length,
    pending: rows.filter((n) => n.status === "pending").length,
    failed: rows.filter((n) => n.status === "failed").length,
  }

  const cards: { label: string; value: number; icon: typeof Layers; accent: StatAccent }[] = [
    { label: "Total", value: summary.total, icon: Layers, accent: "muted" },
    { label: "Sent", value: summary.sent, icon: CheckCheck, accent: "gold" },
    { label: "Pending", value: summary.pending, icon: Clock, accent: "blue" },
    { label: "Failed", value: summary.failed, icon: XCircle, accent: "red" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Every email the system has attempted to send, most recent 200."
      />

      <StatGrid className="sm:grid-cols-4">
        {cards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No notifications recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Recipient</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="bg-card sticky left-0 z-10 max-w-48 border-r">
                      <div className="truncate text-xs">{n.recipient_email}</div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {n.submissions?.reference_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {TYPE_LABELS[n.notification_type] ?? n.notification_type}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs">{n.subject}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(n.status)}>{n.status}</Badge>
                      {n.status === "failed" && n.error_message && (
                        <p className="text-destructive mt-1 max-w-48 truncate text-xs" title={n.error_message}>
                          {n.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{n.retry_count}</TableCell>
                    <TableCell>
                      {n.status !== "sent" && <RetryNotificationButton notificationId={n.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
