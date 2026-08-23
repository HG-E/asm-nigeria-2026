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

const DOCUMENT_TYPES = ["pdf", "jpg", "jpeg", "png"]
const PHOTO_TYPES = ["jpg", "jpeg", "png"]
const MAX_FILE_BYTES = 1 * 1024 * 1024
const IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const IP_MAX_REGISTRATIONS = 5

async function getClientIp(): Promise<string | null> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return headerList.get("x-real-ip")
}

function validateFile(
  file: FormDataEntryValue | null,
  { required, allowedTypes, label }: { required: boolean; allowedTypes: string[]; label: string }
): { error: string } | { file: File | null } {
  if (!(file instanceof File) || file.size === 0) {
    if (required) return { error: `Please upload your ${label}.` }
    return { file: null }
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!allowedTypes.includes(extension)) {
    return { error: `${label[0].toUpperCase()}${label.slice(1)} must be ${allowedTypes.join(", ").toUpperCase()}.` }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: `Your ${label} exceeds the 1MB limit.` }
  }
  return { file }
}

export async function submitRegistrationAction(formData: FormData): Promise<RegistrationActionResult> {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    institution: formData.get("institution"),
    participantCategory: formData.get("participantCategory"),
    attendanceMode: formData.get("attendanceMode"),
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

  const receiptCheck = validateFile(formData.get("receipt"), {
    required: true,
    allowedTypes: DOCUMENT_TYPES,
    label: "payment receipt or screenshot",
  })
  if ("error" in receiptCheck) return receiptCheck
  const receiptFile = receiptCheck.file!

  const photoCheck = validateFile(formData.get("photo"), {
    required: true,
    allowedTypes: PHOTO_TYPES,
    label: "passport photograph",
  })
  if ("error" in photoCheck) return photoCheck
  const photoFile = photoCheck.file!

  const certificateCheck = validateFile(formData.get("certificate"), {
    required: false,
    allowedTypes: DOCUMENT_TYPES,
    label: "ASM membership certificate",
  })
  if ("error" in certificateCheck) return certificateCheck
  const certificateFile = certificateCheck.file

  const admin = createAdminClient()
  const ip = await getClientIp()

  if (ip) {
    const { count } = await admin
      .from("conference_registrations")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", new Date(Date.now() - IP_WINDOW_MS).toISOString())
    if ((count ?? 0) >= IP_MAX_REGISTRATIONS) {
      return { error: "Too many registrations submitted from this connection recently. Please wait a while and try again, or contact the Admin directly." }
    }
  }

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "Registration is not open right now. Please try again later." }
  }

  // A rejected registration needs a fresh submission to fix whatever was
  // wrong with the receipt, so only pending/verified rows count as "already
  // registered" -- otherwise someone whose payment was rejected would be
  // permanently locked out of retrying.
  const { data: existing } = await admin
    .from("conference_registrations")
    .select("reference_number")
    .eq("conference_id", conference.id)
    .eq("email", parsed.data.email)
    .in("payment_status", ["pending", "verified"])
    .maybeSingle()
  if (existing) {
    return {
      error: `This email is already registered (reference: ${existing.reference_number}). If you need to make changes or believe this is a mistake, contact the Admin at ${conference.secretariat_email ?? "the conference email"}.`,
    }
  }

  const period = currentRegistrationPeriod()
  const category = parsed.data.participantCategory as ParticipantCategory
  const fee = feeFor(category, period)
  const amountExpected = parsed.data.includeWorkshop
    ? `${fee} + ${WORKSHOP_FEE[period]} (pre-conference workshop)`
    : fee
  const currency = fee.trim().startsWith("$") ? "USD" : "NGN"

  const uploadedPaths: string[] = []
  async function uploadOne(file: File, kind: string) {
    const path = `${conference!.id}/${kind}/${Date.now()}-${file.name}`
    const { error } = await admin.storage
      .from("registration-receipts")
      .upload(path, await file.arrayBuffer(), { contentType: file.type || undefined })
    if (error) return null
    uploadedPaths.push(path)
    return path
  }

  const receiptPath = await uploadOne(receiptFile, "receipts")
  const photoPath = await uploadOne(photoFile, "photos")
  const certificatePath = certificateFile ? await uploadOne(certificateFile, "certificates") : null

  if (!receiptPath || !photoPath || (certificateFile && !certificatePath)) {
    if (uploadedPaths.length > 0) {
      await admin.storage.from("registration-receipts").remove(uploadedPaths)
    }
    return { error: "Could not upload your files. Please try again." }
  }

  const { data: referenceNumber, error: refError } = await admin.rpc("generate_registration_reference", {
    p_conference_id: conference.id,
  })
  if (refError || !referenceNumber) {
    await admin.storage.from("registration-receipts").remove(uploadedPaths)
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
    attendance_mode: parsed.data.attendanceMode,
    registration_period: period,
    amount_expected: amountExpected,
    payment_currency: currency,
    payment_receipt_path: receiptPath,
    passport_photo_path: photoPath,
    asm_certificate_path: certificatePath,
    ip_address: ip,
  })

  if (insertError) {
    await admin.storage.from("registration-receipts").remove(uploadedPaths)
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
            <p>Review and verify the receipt (and certificate, if a member rate was claimed) from the admin registrations page.</p>
          `,
        })
      } catch {
        // registration row + files are already durable; admin can still find it
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
