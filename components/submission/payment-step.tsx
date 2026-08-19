"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { recordPaymentReceiptAction } from "@/app/author/submissions/[id]/payment-actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

type CurrentReceipt = { path: string; uploadedAt: string } | null

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function PaymentStep({
  submissionId,
  userId,
  currentReceipt,
  defaultCurrency,
  feeNgn,
  feeUsd,
  accountDetails,
  backHref,
  nextHref,
}: {
  submissionId: string
  userId: string
  currentReceipt: CurrentReceipt
  defaultCurrency: "NGN" | "USD" | null
  feeNgn: number | null
  feeUsd: number | null
  accountDetails: string | null
  backHref: string
  nextHref: string
}) {
  const router = useRouter()
  const [currency, setCurrency] = useState<"NGN" | "USD" | "">(defaultCurrency ?? "")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = ["pdf", "jpg", "jpeg", "png"]

  async function handleFileSelected(file: File) {
    setError(null)
    if (!currency) {
      setError("Select which currency you paid in first.")
      return
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!allowedTypes.includes(extension)) {
      setError("Only PDF, JPG, or PNG files are permitted.")
      return
    }
    if (file.size > 1 * 1024 * 1024) {
      setError("This file exceeds the 1MB limit.")
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const storagePath = `${userId}/${submissionId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) {
        setError("Upload failed. Please try again.")
        return
      }

      const result = await recordPaymentReceiptAction(submissionId, {
        storagePath,
        fileType: file.type || extension,
        fileSizeBytes: file.size,
        currency,
      })

      if ("error" in result) {
        setError(result.error)
        return
      }

      setFileName(file.name)
      toast.success("Receipt uploaded")
      router.refresh()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const hasReceipt = Boolean(currentReceipt) || Boolean(fileName)

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Submission fee</p>
        <p>
          {feeNgn ? `₦${feeNgn.toLocaleString()}` : "—"}
          {feeUsd ? ` (or $${feeUsd.toLocaleString()})` : ""} per abstract, paid by bank
          transfer to the account below.
        </p>
        {accountDetails ? (
          <p className="whitespace-pre-wrap">{accountDetails}</p>
        ) : (
          <p className="text-muted-foreground">
            Payment account details have not been configured yet — contact the secretariat.
          </p>
        )}
        <p className="text-muted-foreground">
          After paying, select the currency you paid in and upload your receipt or a
          screenshot of the successful transfer below.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Currency paid</label>
        <Select value={currency} onValueChange={(value) => setCurrency((value as "NGN" | "USD") ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NGN">NGN — Nigerian Naira</SelectItem>
            <SelectItem value="USD">USD — US Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground text-sm">
        Accepted formats: PDF, JPG, PNG. Maximum size: 1MB.
      </p>

      {hasReceipt ? (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {fileName ?? currentReceipt?.path.split("/").pop()}
              </p>
              <p className="text-muted-foreground text-xs">Receipt uploaded</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer border-dashed"
          onClick={() => {
            if (!currency) {
              setError("Select which currency you paid in first.")
              return
            }
            inputRef.current?.click()
          }}
        >
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {uploading ? "Uploading..." : "Click to select your receipt or payment screenshot"}
          </CardContent>
        </Card>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelected(file)
        }}
      />

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
          Back
        </Link>
        {hasReceipt ? (
          <Link href={nextHref} className={buttonVariants()}>
            Next
          </Link>
        ) : (
          <Button type="button" disabled>
            Upload your receipt to continue
          </Button>
        )}
      </div>
    </div>
  )
}
