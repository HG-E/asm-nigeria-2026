import { ProfileForm } from "@/components/author/profile-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuth } from "@/lib/auth"

export default async function AuthorProfilePage() {
  const session = await requireAuth()
  const { profile, email } = session

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          This information automatically populates new abstract submissions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={email}
            defaultValues={{
              firstName: profile.first_name,
              lastName: profile.last_name,
              professionalTitle: profile.professional_title ?? "",
              institution: profile.institution ?? "",
              department: profile.department ?? "",
              country: profile.country ?? "",
              phone: profile.phone ?? "",
              orcid: profile.orcid ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
