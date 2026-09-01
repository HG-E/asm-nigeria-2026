import { PageHeader } from "@/components/dashboard/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export default async function AdminAuditLogsPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Most recent 200 system actions." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {!logs || logs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No activity recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="bg-card sticky left-0 z-10 border-r text-xs text-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.actor_email ?? "System"}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      {log.entity_type}
                      {log.entity_id ? ` (${log.entity_id.slice(0, 8)}…)` : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.previous_status && log.new_status
                        ? `${log.previous_status} → ${log.new_status}`
                        : "—"}
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
