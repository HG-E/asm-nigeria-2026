"use server"

import { headers } from "next/headers"
import { after } from "next/server"

import { getActiveConference } from "@/lib/conference"
import { sendMail } from "@/lib/email"
import { currentRegistrationPeriod, feeFor, WORKSHOP_FEE, type ParticipantCategory } from "@/lib/registration-fees"
import { registrationConfirmationHtml } from "@/lib/registration-email"
import { createAdminClient } from "@/lib/supabase/admin"
import { registrationSchema } from "@/lib/validations/registration"

export type RegistrationActionResult = { error: string } | { success: true; referenceNumber: string }

const ALLOWED_TYPES = ["pdf", "jpg", "jpeg", "png"]
const MAX_FILE_BYTES = 1 * 1024 * 1024
const IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const IP_MAX_REGISTRATIONS = 5

async function getClientIp(): Promise<string | null> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return headerList.get("x-real-ip")
}

export async function submitRegistrationAction(formData: FormData): Promise<RegistrationActionResult> {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    institution: formData.get("institution"),
    participantCategory: formData.get("participantCategory"),
    includeWorkshop: formData.get("includeWorkshop") === "true",
    company: formData.get("company"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." }
  }

  // Honeypot tripped -- pretend success, no DB/storage work.
  if (parsed.data.company) {
    return { success: true, referenceNumber: "REG-0000" }
  }

  const file = formData.get("receipt")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please upload your payment receipt or screenshot." }
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_TYPES.includes(extension)) {
    return { error: "Only PDF, JPG, or PNG files are permitted for the receipt." }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "The receipt file exceeds the 1MB limit." }
  }

  const admin = createAdminClient()
  const ip = await getClientIp()

  if (ip) {
    const { count } = await admin
      .from("conference_registrations")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", new Date(Date.now() - IP_WINDOW_MS).toISOString())
    if ((count ?? 0) >= IP_MAX_REGISTRATIONS) {
      return { error: "Too many registrations submitted from this connection recently. Please wait a while and try again, or contact the secretariat directly." }
    }
  }

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "Registration is not open right now. Please try again later." }
  }

  const period = currentRegistrationPeriod()
  const category = parsed.data.participantCategory as ParticipantCategory
  const fee = feeFor(category, period)
  const amountExpected = parsed.data.includeWorkshop
    ? `${fee} + ${WORKSHOP_FEE[period]} (pre-conference workshop)`
    : fee
  const currency = fee.trim().startsWith("$") ? "USD" : "NGN"

  const storagePath = `${conference.id}/${Date.now()}-${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from("registration-receipts")
    .upload(storagePath, arrayBuffer, { contentType: file.type || undefined })

  if (uploadError) {
    return { error: "Could not upload your receipt. Please try again." }
  }

  const { data: referenceNumber, error: refError } = await admin.rpc("generate_registration_reference", {
    p_conference_id: conference.id,
  })
  if (refError || !referenceNumber) {
    await admin.storage.from("registration-receipts").remove([storagePath])
    return { error: "Could not complete registration. Please try again." }
  }

  const { error: insertError } = await admin.from("conference_registrations").insert({
    conference_id: conference.id,
    reference_number: referenceNumber,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    institution: parsed.data.institution || null,
    participant_category: category,
    registration_period: period,
    amount_expected: amountExpected,
    payment_currency: currency,
    payment_receipt_path: storagePath,
    ip_address: ip,
  })

  if (insertError) {
    await admin.storage.from("registration-receipts").remove([storagePath])
    return { error: "Could not complete registration. Please try again." }
  }

  after(async () => {
    if (conference.secretariat_email) {
      try {
        await sendMail({
          to: conference.secretariat_email,
          subject: `New conference registration — ${referenceNumber}`,
          html: `
            <p><strong>Reference:</strong> ${referenceNumber}</p>
            <p><strong>Name:</strong> ${parsed.data.fullName}</p>
            <p><strong>Email:</strong> ${parsed.data.email}</p>
            <p><strong>Category:</strong> ${category} (${period})</p>
            <p><strong>Amount expected:</strong> ${amountExpected}</p>
            <p>Review and verify the receipt from the admin registrations page.</p>
          `,
        })
      } catch {
        // registration row + receipt are already durable; admin can still find it
      }
    }
    try {
      await sendMail({
        to: parsed.data.email,
        subject: `Registration received — ${referenceNumber}`,
        html: registrationConfirmationHtml({
          fullName: parsed.data.fullName,
          referenceNumber,
          category,
          amountExpected,
        }),
      })
    } catch {
      // best-effort
    }
  })

  return { success: true, referenceNumber }
}
