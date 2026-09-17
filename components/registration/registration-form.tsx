"use client"

import { useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { submitRegistrationAction } from "@/app/register-conference/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  currentRegistrationPeriod,
  feeFor,
  PARTICIPANT_CATEGORIES,
  WORKSHOP_FEE,
  type ParticipantCategory,
} from "@/lib/registration-fees"
import { ATTENDANCE_MODES, registrationSchema, type RegistrationInput } from "@/lib/validations/registration"

const period = currentRegistrationPeriod()

// Must match MAX_FILE_MB in app/register-conference/actions.ts (itself tied
// to the registration-receipts Storage bucket's file_size_limit) -- checked
// again on submit there regardless, this just gives an immediate answer
// instead of making someone wait on a round trip to find out their photo
// was too big.
const MAX_FILE_MB = 1
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileUploadField({
  label,
  hint,
  accept,
  allowedTypes,
  file,
  onChange,
  error,
  setError,
}: {
  label: string
  hint: string
  accept: string
  allowedTypes: string[]
  file: File | null
  onChange: (file: File | null) => void
  error: string | null
  setError: (error: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelected(selected: File | null) {
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

export function RegistrationForm() {
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      institution: "",
      participantCategory: undefined,
      attendanceMode: undefined,
      includeWorkshop: false,
      company: "",
    },
  })

  const category = form.watch("participantCategory") as ParticipantCategory | undefined
  const includeWorkshop = form.watch("includeWorkshop")
  const fee = category ? feeFor(category, period) : null

  function onSubmit(values: RegistrationInput) {
    setSubmitError(null)
    setReceiptError(null)
    setPhotoError(null)
    setCertificateError(null)

    let hasFileError = false
    if (!receiptFile) {
      setReceiptError("Please upload your payment receipt or screenshot.")
      hasFileError = true
    }
    if (!photoFile) {
      setPhotoError("Please upload a passport photograph.")
      hasFileError = true
    }
    if (hasFileError) return

    const formData = new FormData()
    formData.set("fullName", values.fullName)
    formData.set("email", values.email)
    formData.set("phone", values.phone ?? "")
    formData.set("institution", values.institution ?? "")
    formData.set("participantCategory", values.participantCategory)
    formData.set("attendanceMode", values.attendanceMode)
    formData.set("includeWorkshop", String(values.includeWorkshop))
    formData.set("company", values.company ?? "")
    formData.set("receipt", receiptFile!)
    formData.set("photo", photoFile!)
    if (certificateFile) formData.set("certificate", certificateFile)

    // A Server Action called directly (not via a <form action> or
    // <button formAction>) only gets React's transition-based handling of
    // its streamed response if it's explicitly wrapped in startTransition --
    // Next's own docs call this out as something that "happens
    // automatically" for form/button actions but not otherwise. Without it,
    // the server received the submission and responded successfully (this
    // was confirmed directly against the network response), but nothing on
    // the client ever finished processing that response: the button sat on
    // "Submitting..." forever with no success, no error, nothing -- exactly
    // what was being reported as "clicking and it's not responding."
    startTransition(async () => {
      try {
        const result = await submitRegistrationAction(formData)
        if ("error" in result) {
          setSubmitError(result.error)
          return
        }
        setReferenceNumber(result.referenceNumber)
      } catch {
        // A thrown (rather than returned) error means the request never made
        // it to the action at all -- a dropped connection, or the request
        // being rejected outright before our own code could run.
        setSubmitError(
          "Your registration could not be submitted -- this is usually a dropped internet connection or a file that's too large. Please check your connection and try again. If it keeps happening, contact the Admin directly."
        )
      }
    })
  }

  if (referenceNumber) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Registration received</h2>
        <p className="text-muted-foreground text-sm">
          Your reference number is <strong className="text-foreground">{referenceNumber}</strong>.
          A confirmation email is on its way. The admin will verify your receipt and confirm
          your registration within 2-3 working days.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
          <p className="font-medium">
            {period === "early" ? "Early/Regular registration (till Oct 22, 2026)" : "Late registration (after Oct 22, 2026)"}
          </p>
          <p className="text-muted-foreground">
            Complete your bank transfer first (see the Payment section on the homepage), then
            fill this form with your receipt.
          </p>
          <p className="text-muted-foreground">
            You&apos;ll need two files ready before you start: a photo or screenshot of your payment
            receipt, and a passport photograph of yourself (each under {MAX_FILE_MB}MB).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="participantCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Participant category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PARTICIPANT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} — {feeFor(c, period)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attendanceMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Will you attend virtually or in-person?</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select how you'll attend" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ATTENDANCE_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeWorkshop"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Add the pre-conference hands-on workshop ({WORKSHOP_FEE[period]})
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {fee && (
          <p className="text-sm">
            <span className="font-medium">Amount due: </span>
            {fee}
            {includeWorkshop && <> + {WORKSHOP_FEE[period]} workshop fee</>}
          </p>
        )}

        <FileUploadField
          label="Payment receipt or screenshot"
          hint={`A photo or screenshot of your bank transfer confirmation. PDF, JPG, or PNG, up to ${MAX_FILE_MB}MB -- a normal phone photo is fine, just avoid sending the original full-resolution camera file if it's very large.`}
          accept=".pdf,.jpg,.jpeg,.png"
          allowedTypes={["pdf", "jpg", "jpeg", "png"]}
          file={receiptFile}
          onChange={setReceiptFile}
          error={receiptError}
          setError={setReceiptError}
        />

        <FileUploadField
          label="Passport photograph"
          hint={`A clear, front-facing photo of yourself, used for your participation pack and badge. JPG or PNG, up to ${MAX_FILE_MB}MB.`}
          accept=".jpg,.jpeg,.png"
          allowedTypes={["jpg", "jpeg", "png"]}
          file={photoFile}
          onChange={setPhotoFile}
          error={photoError}
          setError={setPhotoError}
        />

        <FileUploadField
          label="Recent ASM Membership Certificate (optional)"
          hint={`Only needed if you're a member and are registering at the member rate. PDF, JPG, or PNG, up to ${MAX_FILE_MB}MB.`}
          accept=".pdf,.jpg,.jpeg,.png"
          allowedTypes={["pdf", "jpg", "jpeg", "png"]}
          file={certificateFile}
          onChange={setCertificateFile}
          error={certificateError}
          setError={setCertificateError}
        />

        {/* Honeypot -- hidden from real visitors */}
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input tabIndex={-1} autoComplete="off" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {submitError && (
          <div className="border-destructive bg-destructive/5 text-destructive rounded-lg border p-4 text-sm" role="alert">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1">{submitError}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit registration"}
        </Button>
      </form>
    </Form>
  )
}
