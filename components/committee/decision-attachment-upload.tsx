"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { uploadDecisionAttachmentAction } from "@/app/committee/submissions/[id]/actions"
import { Button } from "@/components/ui/button"

export function DecisionAttachmentUpload({
  submissionId,
  decisionId,
  currentFileName,
  downloadUrl,
}: {
  submissionId: string
  decisionId: string | null
  currentFileName: string | null
  downloadUrl: string | null
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!decisionId) {
    return (
      <p className="text-muted-foreground text-sm">
        Save the decision below before attaching a corrected file.
      </p>
    )
  }

  async function handleFileSelected(file: File) {
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadDecisionAttachmentAction(submissionId, formData)
      if ("error" in result) {
        setError(result.error)
        return
      }
      toast.success("Attachment saved. It reaches the author once the decision is finalized.")
      router.refresh()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2 text-sm">
      {currentFileName ? (
        <p>
          <span className="text-muted-foreground">Attached: </span>
          {downloadUrl ? (
            <Link
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {currentFileName}
            </Link>
          ) : (
            currentFileName
          )}
          <span className="text-muted-foreground">
            {" "}
            — not visible to the author until the decision is finalized.
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground">No corrected file attached yet.</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : currentFileName ? "Replace file" : "Attach a file"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelected(file)
        }}
      />
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
