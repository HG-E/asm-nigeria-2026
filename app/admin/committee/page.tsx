import { AddCommitteeForm } from "@/components/admin/add-committee-form"
import { CommitteeRow } from "@/components/admin/committee-row"
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
import { createClient } from "@/lib/supabase/server"

export default async function AdminCommitteePage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: members } = await supabase
    .from("committee_members")
    .select("*, user_profiles(first_name, last_name, email, institution)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scientific Committee"
        description="Committee members review reviewer scores and recommendations, and propose final decisions for admin sign-off."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Committee Member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddCommitteeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Members ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {!members || members.length === 0 ? (
            <p className="text-muted-foreground px-6 text-sm sm:px-0">No committee members added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Member</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="bg-card sticky left-0 z-10 border-r">
                      <div className="font-medium">
                        {m.user_profiles?.first_name} {m.user_profiles?.last_name}
                      </div>
                      <div className="text-muted-foreground text-xs">{m.user_profiles?.email}</div>
                    </TableCell>
                    <TableCell>{m.title ?? "—"}</TableCell>
                    <TableCell>{m.user_profiles?.institution ?? "—"}</TableCell>
                    <TableCell colSpan={2}>
                      <CommitteeRow memberId={m.id} isActive={m.is_active} />
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
