import { AddRegistrationDeskForm } from "@/components/admin/add-registration-desk-form"
import { PageHeader } from "@/components/dashboard/page-header"
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
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminRegistrationDeskPage() {
  await requireRole("admin")

  // RLS on user_profiles has no policy letting one user read another's
  // row, so listing every registration_desk account needs the
  // service-role client (same reasoning as the author-email lookup fix
  // in finalizeDecisionAction).
  const { data: members } = await createAdminClient()
    .from("user_profiles")
    .select("id, first_name, last_name, email, institution, created_at")
    .eq("role", "registration_desk")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Registration Desk"
        description={
          <>
            Registration desk accounts can view and export the conference registrations list at{" "}
            <code>/registration-desk</code> — nothing else. They cannot see abstracts, reviews,
            decisions, or committee data.
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Registration Desk Member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddRegistrationDeskForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Members ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!members || members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No registration desk members added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.first_name} {m.last_name}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.institution ?? "—"}</TableCell>
                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
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
