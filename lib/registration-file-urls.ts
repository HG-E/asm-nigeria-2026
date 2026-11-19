import "server-only"

import type { createAdminClient } from "@/lib/supabase/admin"

export type RegistrationFileLinks = { receipt: string | null; photo: string | null; certificate: string | null }

type Registration = {
  id: string
  payment_receipt_path: string | null
  passport_photo_path: string | null
  asm_certificate_path: string | null
}

// Each registrant's receipt/photo/certificate path used to be signed one at
// a time, sequentially, in a loop over every registration (up to ~800 calls
// for a few hundred registrants). Supabase Storage started rate-limiting
// that under real load ("Too many connections issued to the database", 429)
// and the failures were silently swallowed into a null URL -- surfacing as a
// registrant who genuinely has a photo on file showing "No photo" or a
// missing "Photo" link, nondeterministically, depending on which calls got
// rate-limited that page load. createSignedUrls (plural) signs a whole list
// of paths in a single request, so this does it in 3 calls total instead of
// up to 3 per registrant.
export async function buildRegistrationFileUrls(
  storageAdmin: ReturnType<typeof createAdminClient>,
  registrations: Registration[]
): Promise<Map<string, RegistrationFileLinks>> {
  async function batchSign(paths: (string | null)[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))))
    if (unique.length === 0) return new Map()
    const { data } = await storageAdmin.storage.from("registration-receipts").createSignedUrls(unique, 60 * 10)
    const map = new Map<string, string>()
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) map.set(d.path, d.signedUrl)
    }
    return map
  }

  const [receiptUrls, photoUrls, certificateUrls] = await Promise.all([
    batchSign(registrations.map((r) => r.payment_receipt_path)),
    batchSign(registrations.map((r) => r.passport_photo_path)),
    batchSign(registrations.map((r) => r.asm_certificate_path)),
  ])

  const fileUrls = new Map<string, RegistrationFileLinks>()
  for (const r of registrations) {
    fileUrls.set(r.id, {
      receipt: r.payment_receipt_path ? (receiptUrls.get(r.payment_receipt_path) ?? null) : null,
      photo: r.passport_photo_path ? (photoUrls.get(r.passport_photo_path) ?? null) : null,
      certificate: r.asm_certificate_path ? (certificateUrls.get(r.asm_certificate_path) ?? null) : null,
    })
  }
  return fileUrls
}
