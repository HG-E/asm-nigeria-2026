"use client"

import { useRef } from "react"

// Must match MAX_FILE_MB in app/register-conference/actions.ts and
// app/register-workshop/add-on-actions.ts (both tied to the
// registration-receipts Storage bucket's file_size_limit) -- checked again
// on submit server-side regardless, this just gives an immediate answer
// instead of making someone wait on a round trip to find out their file was
// too big.
const MAX_FILE_MB = 1
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Reads an image file's pixel dimensions in the browser, for the minDimension
// check below -- there's no server-side equivalent of this (no image library
// in this project), so a badge-quality floor is enforced here only. That's an
// acceptable gap for a human-facing registration form: nobody is attacking
// this field, they're just picking a photo, so a client-side check is enough
// to actually stop the blurry/tiny uploads it's meant to catch.
function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

export function FileUploadField({
  label,
  hint,
  accept,
  allowedTypes,
  minDimension,
  file,
  onChange,
  error,
  setError,
}: {
  label: string
  hint: string
  accept: string
  allowedTypes: string[]
  minDimension?: number
  file: File | null
  onChange: (file: File | null) => void
  error: string | null
  setError: (error: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSelected(selected: File | null) {
    if (!selected) {
      onChange(null)
      return
    }
    const extension = selected.name.split(".").pop()?.toLowerCase() ?? ""
    if (!allowedTypes.includes(extension)) {
      setError(`That's a .${extension || "?"} file -- please pick a ${allowedTypes.join(", ").toUpperCase()} file instead.`)
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError(
        `That file is ${formatBytes(selected.size)}, which is over the ${MAX_FILE_MB}MB limit. Try compressing the photo, or take a lower-resolution screenshot instead.`
      )
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    if (minDimension) {
      const dims = await readImageDimensions(selected)
      if (dims && (dims.width < minDimension || dims.height < minDimension)) {
        setError(
          `That photo is only ${dims.width}×${dims.height}px -- too small to print clearly on a badge. Please use a photo at least ${minDimension}×${minDimension}px (most phone camera photos are fine; a tiny thumbnail or heavily cropped screenshot usually isn't).`
        )
        onChange(null)
        if (inputRef.current) inputRef.current.value = ""
        return
      }
    }
    setError(null)
    onChange(selected)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-muted-foreground text-sm">{hint}</p>
      <div
        className={
          error
            ? "border-destructive bg-destructive/5 cursor-pointer rounded-lg border p-6 text-center text-sm"
            : "hover:bg-muted/50 cursor-pointer rounded-lg border border-dashed p-6 text-center text-sm"
        }
        onClick={() => inputRef.current?.click()}
      >
        {file ? `${file.name} (${formatBytes(file.size)})` : "Click to select a file"}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleSelected(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
