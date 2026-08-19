import { RetryNotificationButton } from "@/components/admin/retry-notification-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "sent") return "default"
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Every email the system has attempted to send, most recent 200.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Total", summary.total],
          ["Sent", summary.sent],
          ["Pending", summary.pending],
          ["Failed", summary.failed],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No notifications recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Recipient</TableHead>
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
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(n.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs">{n.recipient_email}</TableCell>
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
