import { RegistrationScanner } from "@/components/admin/registration-scanner"
import { PageHeader } from "@/components/dashboard/page-header"
import { requireRole } from "@/lib/auth"

export default async function AdminScanCheckInPage() {
  await requireRole("admin")

  return (
    <div className="space-y-6">
      <PageHeader title="Scan Check-in" description="Scan a badge's QR code to check that registrant in." />
      <RegistrationScanner />
    </div>
  )
}
