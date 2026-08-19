import { createSubthemeAction, updateSubthemeAction } from "./actions"
import { SubthemeEditor } from "@/components/admin/subtheme-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function AdminSubthemesPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: conference } = await supabase
    .from("conferences")
    .select("id")
    .eq("is_active", true)
    .single()

  const { data: subthemes } = conference
    ? await supabase
        .from("conference_subthemes")
        .select("*")
        .eq("conference_id", conference.id)
        .order("sort_order", { ascending: true })
    : { data: [] }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Subthemes</h1>
        <p className="text-muted-foreground text-sm">
          Authors select from these when submitting an abstract. Inactive subthemes are
          hidden from authors but still shown here so they can be re-enabled.
        </p>
      </div>

      <div className="space-y-4">
        {subthemes?.map((subtheme) => (
          <SubthemeEditor
            key={subtheme.id}
            defaultValues={{
              name: subtheme.name,
              description: subtheme.description ?? "",
              code: subtheme.code,
              isActive: subtheme.is_active,
            }}
            onSave={updateSubthemeAction.bind(null, subtheme.id)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a subtheme</CardTitle>
        </CardHeader>
        <CardContent>
          <SubthemeEditor
            defaultValues={{ name: "", description: "", code: "", isActive: true }}
            onSave={createSubthemeAction}
            submitLabel="Create"
            resetOnSuccess
          />
        </CardContent>
      </Card>
    </div>
  )
}
