"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteDocumentAction, recordDocumentAction } from "@/app/author/submissions/[id]/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type CurrentDocument = {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
} | null

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step5Upload({
  submissionId,
  userId,
  currentDocument,
  allowedFileTypes,
  maxFileSizeMb,
  backHref,
  nextHref,
}: {
  submissionId: string
  userId: string
  currentDocument: CurrentDocument
  allowedFileTypes: string[]
  maxFileSizeMb: number
  backHref: string
  nextHref: string
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelected(file: File) {
    setError(null)
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!allowedFileTypes.includes(extension)) {
      setError(`Only ${allowedFileTypes.join(", ").toUpperCase()} files are permitted.`)
      return
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setError(`This file exceeds the ${maxFileSizeMb}MB limit.`)
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const storagePath = `${userId}/${submissionId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("abstracts")
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) {
        setError("Upload failed. Please try again.")
        return
      }

      const result = await recordDocumentAction(submissionId, {
        fileName: file.name,
        fileType: file.type || extension,
        fileSizeBytes: file.size,
        storagePath,
      })

      if ("error" in result) {
        setError(result.error)
        return
      }

      toast.success("Document uploaded")
      router.refresh()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleRemove() {
    if (!currentDocument) return
    setError(null)
    const result = await deleteDocumentAction(submissionId, currentDocument.id)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Document removed")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Accepted formats: {allowedFileTypes.join(", ").toUpperCase()}. Maximum size: {maxFileSizeMb}MB.
      </p>

      {currentDocument ? (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{currentDocument.file_name}</p>
              <p className="text-muted-foreground text-xs">
                {formatBytes(currentDocument.file_size_bytes)} &middot; Uploaded
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleRemove}
                aria-label="Remove document"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {uploading ? "Uploading..." : "Click to select a file to upload"}
          </CardContent>
        </Card>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={allowedFileTypes.map((t) => `.${t}`).join(",")}
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
        {currentDocument ? (
          <Link href={nextHref} className={buttonVariants()}>
            Next
          </Link>
        ) : (
          <Button type="button" disabled>
            Upload a document to continue
          </Button>
        )}
      </div>
    </div>
  )
}
